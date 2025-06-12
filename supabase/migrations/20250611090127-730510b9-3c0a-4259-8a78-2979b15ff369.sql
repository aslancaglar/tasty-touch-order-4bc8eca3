
-- First, migrate any remaining plaintext API keys to encrypted storage
-- This will be handled by the existing migration function in the edge function

-- Remove the plaintext api_key column from restaurant_print_config
-- This is safe to do after migration since we now store keys in encrypted vault
ALTER TABLE public.restaurant_print_config 
DROP COLUMN IF EXISTS api_key;

-- Add a function to get keys that need rotation alerts
CREATE OR REPLACE FUNCTION public.get_keys_needing_rotation_alerts()
RETURNS TABLE (
  restaurant_id UUID,
  service_name TEXT,
  key_name TEXT,
  days_since_rotation INTEGER,
  alert_level TEXT
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
    EXTRACT(DAY FROM (now() - rak.last_rotated))::INTEGER as days_since_rotation,
    CASE 
      WHEN EXTRACT(DAY FROM (now() - rak.last_rotated)) > (rak.rotation_interval_days * 2) THEN 'CRITICAL'
      WHEN EXTRACT(DAY FROM (now() - rak.last_rotated)) > rak.rotation_interval_days THEN 'WARNING'
      WHEN EXTRACT(DAY FROM (now() - rak.last_rotated)) > (rak.rotation_interval_days * 0.8) THEN 'INFO'
      ELSE 'OK'
    END as alert_level
  FROM public.restaurant_api_keys rak
  WHERE rak.is_active = true
    AND rak.rotation_interval_days IS NOT NULL
    AND EXTRACT(DAY FROM (now() - rak.last_rotated)) > (rak.rotation_interval_days * 0.8)
    AND (
      public.is_restaurant_owner_secure(rak.restaurant_id) 
      OR public.is_admin_secure()
    )
  ORDER BY days_since_rotation DESC;
END;
$$;

-- Create a function to automatically rotate keys that are severely overdue
CREATE OR REPLACE FUNCTION public.auto_deactivate_overdue_keys()
RETURNS TABLE (
  restaurant_id UUID,
  service_name TEXT,
  key_name TEXT,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate keys that are more than 2x their rotation interval overdue
  UPDATE public.restaurant_api_keys
  SET is_active = false,
      updated_at = now()
  WHERE is_active = true
    AND rotation_interval_days IS NOT NULL
    AND (now() - last_rotated) > INTERVAL '1 day' * (rotation_interval_days * 2);

  -- Log the deactivations
  INSERT INTO public.api_key_rotation_log (
    restaurant_id,
    service_name,
    key_name,
    rotation_type,
    rotation_reason
  )
  SELECT 
    rak.restaurant_id,
    rak.service_name,
    rak.key_name,
    'forced',
    'automatic_deactivation_overdue'
  FROM public.restaurant_api_keys rak
  WHERE NOT rak.is_active
    AND rak.rotation_interval_days IS NOT NULL
    AND (now() - rak.last_rotated) > INTERVAL '1 day' * (rak.rotation_interval_days * 2)
    AND NOT EXISTS (
      SELECT 1 FROM public.api_key_rotation_log arl
      WHERE arl.restaurant_id = rak.restaurant_id
        AND arl.service_name = rak.service_name
        AND arl.key_name = rak.key_name
        AND arl.rotation_reason = 'automatic_deactivation_overdue'
        AND arl.created_at > (now() - INTERVAL '1 hour')
    );

  -- Return what was deactivated
  RETURN QUERY
  SELECT 
    rak.restaurant_id,
    rak.service_name,
    rak.key_name,
    'DEACTIVATED' as action_taken
  FROM public.restaurant_api_keys rak
  WHERE NOT rak.is_active
    AND rak.rotation_interval_days IS NOT NULL
    AND (now() - rak.last_rotated) > INTERVAL '1 day' * (rak.rotation_interval_days * 2)
    AND rak.updated_at > (now() - INTERVAL '5 minutes');
END;
$$;

-- Create index for better performance on rotation monitoring queries
CREATE INDEX IF NOT EXISTS idx_api_keys_rotation_monitoring 
ON public.restaurant_api_keys (last_rotated, rotation_interval_days, is_active)
WHERE rotation_interval_days IS NOT NULL;
