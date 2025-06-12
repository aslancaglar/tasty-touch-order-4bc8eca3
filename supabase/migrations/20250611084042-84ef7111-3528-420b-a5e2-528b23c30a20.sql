
-- Add automatic rotation enforcement and audit logging for API keys
CREATE TABLE IF NOT EXISTS public.api_key_rotation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  service_name TEXT NOT NULL,
  key_name TEXT NOT NULL,
  rotation_type TEXT NOT NULL, -- 'manual', 'automatic', 'forced'
  old_key_hash TEXT, -- SHA256 hash of old key for audit trail
  rotation_reason TEXT, -- 'scheduled', 'security_breach', 'admin_forced'
  rotated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rotation log
ALTER TABLE public.api_key_rotation_log ENABLE ROW LEVEL SECURITY;

-- Create policies for rotation log
CREATE POLICY "Owners can view their restaurant rotation logs" 
ON public.api_key_rotation_log 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(restaurant_id) 
  OR public.is_admin_secure()
);

-- Add automatic rotation enforcement function
CREATE OR REPLACE FUNCTION public.enforce_api_key_rotation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If rotation interval is set and key is overdue, mark for forced rotation
  IF NEW.rotation_interval_days IS NOT NULL AND 
     (now() - NEW.last_rotated) > INTERVAL '1 day' * NEW.rotation_interval_days THEN
    
    -- Log the overdue rotation
    INSERT INTO public.api_key_rotation_log (
      restaurant_id,
      service_name,
      key_name,
      rotation_type,
      rotation_reason
    ) VALUES (
      NEW.restaurant_id,
      NEW.service_name,
      NEW.key_name,
      'forced',
      'overdue_rotation'
    );
    
    -- Mark key as inactive if severely overdue (2x rotation interval)
    IF (now() - NEW.last_rotated) > INTERVAL '1 day' * (NEW.rotation_interval_days * 2) THEN
      NEW.is_active = false;
      
      -- Log the deactivation
      INSERT INTO public.api_key_rotation_log (
        restaurant_id,
        service_name,
        key_name,
        rotation_type,
        rotation_reason
      ) VALUES (
        NEW.restaurant_id,
        NEW.service_name,
        NEW.key_name,
        'forced',
        'automatic_deactivation'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic rotation enforcement
CREATE TRIGGER enforce_api_key_rotation_trigger
  BEFORE UPDATE ON public.restaurant_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_api_key_rotation();

-- Enhanced rotation function with audit logging
CREATE OR REPLACE FUNCTION public.rotate_api_key_with_audit(
  p_restaurant_id UUID,
  p_service_name TEXT,
  p_key_name TEXT,
  p_new_api_key TEXT,
  p_rotation_reason TEXT DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_secret_id UUID;
  new_secret_id UUID;
  old_key_hash TEXT;
BEGIN
  -- Check permissions
  IF NOT (public.is_restaurant_owner_secure(p_restaurant_id) OR public.is_admin_secure()) THEN
    RAISE EXCEPTION 'Insufficient permissions to rotate API key';
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
  
  -- Create hash of old key for audit trail (we can't decrypt it)
  old_key_hash := encode(sha256(old_secret_id::text::bytea), 'hex');
  
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
  
  -- Log the rotation
  INSERT INTO public.api_key_rotation_log (
    restaurant_id,
    service_name,
    key_name,
    rotation_type,
    old_key_hash,
    rotation_reason,
    rotated_by
  ) VALUES (
    p_restaurant_id,
    p_service_name,
    p_key_name,
    'manual',
    old_key_hash,
    p_rotation_reason,
    auth.uid()
  );
  
  RETURN true;
END;
$$;

-- Function to force rotation of all overdue keys
CREATE OR REPLACE FUNCTION public.force_rotate_overdue_keys()
RETURNS TABLE (
  restaurant_id UUID,
  service_name TEXT,
  key_name TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH overdue_keys AS (
    SELECT 
      rak.restaurant_id,
      rak.service_name,
      rak.key_name,
      EXTRACT(DAY FROM (now() - rak.last_rotated))::INTEGER as days_overdue
    FROM public.restaurant_api_keys rak
    WHERE rak.is_active = true
      AND (rak.rotation_interval_days IS NOT NULL)
      AND (now() - rak.last_rotated) > INTERVAL '1 day' * rak.rotation_interval_days
  )
  SELECT 
    ok.restaurant_id,
    ok.service_name,
    ok.key_name,
    CASE 
      WHEN ok.days_overdue > 60 THEN 'DEACTIVATED'
      ELSE 'ROTATION_REQUIRED'
    END as status
  FROM overdue_keys ok;
  
  -- Deactivate severely overdue keys (older than 60 days past rotation)
  UPDATE public.restaurant_api_keys
  SET is_active = false,
      updated_at = now()
  WHERE id IN (
    SELECT rak.id
    FROM public.restaurant_api_keys rak
    WHERE rak.is_active = true
      AND (rak.rotation_interval_days IS NOT NULL)
      AND (now() - rak.last_rotated) > INTERVAL '60 days'
  );
END;
$$;

-- Create index for performance on rotation monitoring
CREATE INDEX IF NOT EXISTS idx_api_key_rotation_log_restaurant 
ON public.api_key_rotation_log (restaurant_id, created_at DESC);

-- Update default rotation interval to be more aggressive (30 days instead of 90)
ALTER TABLE public.restaurant_api_keys 
ALTER COLUMN rotation_interval_days SET DEFAULT 30;
