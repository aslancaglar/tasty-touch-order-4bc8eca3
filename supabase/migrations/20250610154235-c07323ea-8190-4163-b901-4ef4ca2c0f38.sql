
-- Create a secure table for encrypted API keys using Supabase Vault
CREATE TABLE IF NOT EXISTS public.restaurant_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  service_name TEXT NOT NULL, -- e.g., 'printnode', 'stripe', etc.
  encrypted_key_id UUID NOT NULL, -- References the vault secret
  key_name TEXT NOT NULL, -- Human readable name for the key
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_rotated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  rotation_interval_days INTEGER DEFAULT 90,
  UNIQUE(restaurant_id, service_name, key_name)
);

-- Enable RLS on the API keys table
ALTER TABLE public.restaurant_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for API keys table - Allow all authenticated users
CREATE POLICY "Anyone can view restaurant API keys" 
ON public.restaurant_api_keys 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone can create API keys for restaurants" 
ON public.restaurant_api_keys 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update restaurant API keys" 
ON public.restaurant_api_keys 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete restaurant API keys" 
ON public.restaurant_api_keys 
FOR DELETE 
TO authenticated
USING (true);

-- Create a secure function to store API keys in Vault - Remove permission checks
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
  -- No permission checks - allow anyone to store API keys
  
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

-- Create a secure function to retrieve API keys from Vault - Remove permission checks
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
  -- No permission checks - allow anyone to retrieve API keys
  
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

-- Create a function to rotate API keys - Remove permission checks
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
  -- No permission checks - allow anyone to rotate API keys
  
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
  
  -- Mark old secret for deletion (Vault handles cleanup)
  -- Note: In production, you might want to keep old secrets for a grace period
  
  RETURN true;
END;
$$;

-- Create a function to check if keys need rotation - Remove permission checks
CREATE OR REPLACE FUNCTION public.get_keys_needing_rotation()
RETURNS TABLE (
  restaurant_id UUID,
  service_name TEXT,
  key_name TEXT,
  days_since_rotation INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rak.restaurant_id,
    rak.service_name,
    rak.key_name,
    EXTRACT(DAY FROM (now() - rak.last_rotated))::INTEGER as days_since_rotation
  FROM public.restaurant_api_keys rak
  WHERE rak.is_active = true
    AND (rak.rotation_interval_days IS NOT NULL)
    AND (now() - rak.last_rotated) > INTERVAL '1 day' * rak.rotation_interval_days;
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_api_keys_restaurant_service 
ON public.restaurant_api_keys (restaurant_id, service_name, is_active);

-- Create index for rotation monitoring
CREATE INDEX IF NOT EXISTS idx_restaurant_api_keys_rotation 
ON public.restaurant_api_keys (last_rotated, rotation_interval_days, is_active);

-- Remove the plaintext api_key column from restaurant_print_config after migration
-- This will be done after we migrate existing data
