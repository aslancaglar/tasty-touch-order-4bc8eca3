
-- Update the store_encrypted_api_key function to accept user_id as parameter
CREATE OR REPLACE FUNCTION public.store_encrypted_api_key(
  p_restaurant_id uuid, 
  p_service_name text, 
  p_key_name text, 
  p_api_key text,
  p_user_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
  key_record_id UUID;
  check_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Check if user has permission to manage this restaurant
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    -- If the above fails, check with explicit user_id
    IF check_user_id IS NULL THEN
      RAISE EXCEPTION 'No user ID provided and auth context not available';
    END IF;
    
    -- Manual permission check when auth context is not available
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_owners 
      WHERE restaurant_id = p_restaurant_id AND user_id = check_user_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = check_user_id AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to store API key';
    END IF;
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

-- Update the get_encrypted_api_key function similarly
CREATE OR REPLACE FUNCTION public.get_encrypted_api_key(
  p_restaurant_id uuid, 
  p_service_name text, 
  p_key_name text DEFAULT 'primary',
  p_user_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_id UUID;
  decrypted_key TEXT;
  check_user_id UUID;
BEGIN
  -- Use provided user_id or fall back to auth.uid()
  check_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Check if user has permission to access this restaurant's keys
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    -- If the above fails, check with explicit user_id
    IF check_user_id IS NULL THEN
      RAISE EXCEPTION 'No user ID provided and auth context not available';
    END IF;
    
    -- Manual permission check when auth context is not available
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_owners 
      WHERE restaurant_id = p_restaurant_id AND user_id = check_user_id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = check_user_id AND is_admin = true
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to retrieve API key';
    END IF;
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
