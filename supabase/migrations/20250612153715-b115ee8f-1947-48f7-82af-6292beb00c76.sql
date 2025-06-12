
-- Restore proper permission checks to API key management functions
-- Now that RLS policies are fixed, we can restore security to these functions

CREATE OR REPLACE FUNCTION public.store_encrypted_api_key(
  p_restaurant_id UUID,
  p_service_name TEXT,
  p_key_name TEXT,
  p_api_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
  key_record_id UUID;
BEGIN
  -- Restore proper permission checks
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    RAISE EXCEPTION 'Insufficient permissions to store API key for this restaurant';
  END IF;
  
  -- Store the API key in Vault
  SELECT vault.create_secret(p_api_key) INTO secret_id;
  
  -- Store the reference in our table
  INSERT INTO public.restaurant_api_keys (
    restaurant_id,
    service_name,
    key_name,
    encrypted_key_id
  ) VALUES (
    p_restaurant_id,
    p_service_name,
    p_key_name,
    secret_id
  )
  ON CONFLICT (restaurant_id, service_name, key_name)
  DO UPDATE SET
    encrypted_key_id = secret_id,
    updated_at = now(),
    last_rotated = now(),
    is_active = true
  RETURNING id INTO key_record_id;
  
  RETURN key_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_encrypted_api_key(
  p_restaurant_id UUID,
  p_service_name TEXT,
  p_key_name TEXT DEFAULT 'primary'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
  decrypted_key TEXT;
BEGIN
  -- Restore proper permission checks
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    RAISE EXCEPTION 'Insufficient permissions to retrieve API key for this restaurant';
  END IF;
  
  -- Get the secret ID from our table
  SELECT encrypted_key_id INTO secret_id
  FROM public.restaurant_api_keys
  WHERE restaurant_id = p_restaurant_id 
    AND service_name = p_service_name 
    AND key_name = p_key_name 
    AND is_active = true;
  
  IF secret_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retrieve the decrypted key from Vault
  SELECT decrypted_secret INTO decrypted_key
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  
  RETURN decrypted_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_api_key(
  p_restaurant_id UUID,
  p_service_name TEXT,
  p_key_name TEXT,
  p_new_api_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_secret_id UUID;
  new_secret_id UUID;
BEGIN
  -- Restore proper permission checks
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    RAISE EXCEPTION 'Insufficient permissions to rotate API key for this restaurant';
  END IF;
  
  -- Get the current secret ID
  SELECT encrypted_key_id INTO old_secret_id
  FROM public.restaurant_api_keys
  WHERE restaurant_id = p_restaurant_id 
    AND service_name = p_service_name 
    AND key_name = p_key_name 
    AND is_active = true;
  
  IF old_secret_id IS NULL THEN
    RAISE EXCEPTION 'API key not found for rotation';
  END IF;
  
  -- Create new secret in Vault
  SELECT vault.create_secret(p_new_api_key) INTO new_secret_id;
  
  -- Update the reference
  UPDATE public.restaurant_api_keys
  SET encrypted_key_id = new_secret_id,
      updated_at = now(),
      last_rotated = now()
  WHERE restaurant_id = p_restaurant_id 
    AND service_name = p_service_name 
    AND key_name = p_key_name;
  
  RETURN true;
END;
$$;
