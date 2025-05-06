
-- Add unique constraint to restaurant_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_payment_config_restaurant_id_key'
  ) THEN
    ALTER TABLE public.restaurant_payment_config
    ADD CONSTRAINT restaurant_payment_config_restaurant_id_key UNIQUE (restaurant_id);
  END IF;
END
$$;

-- Clean up any duplicate entries before adding the constraint
-- This will keep the most recently updated entry for each restaurant_id
DELETE FROM public.restaurant_payment_config a
USING (
  SELECT 
    restaurant_id, 
    MAX(updated_at) as max_updated
  FROM 
    public.restaurant_payment_config 
  GROUP BY 
    restaurant_id
  HAVING 
    COUNT(*) > 1
) b
WHERE 
  a.restaurant_id = b.restaurant_id AND 
  a.updated_at < b.max_updated;

-- Update the update_restaurant_payment_config function to handle the unique constraint properly
CREATE OR REPLACE FUNCTION public.update_restaurant_payment_config(
  p_restaurant_id UUID,
  p_stripe_enabled BOOLEAN,
  p_stripe_api_key TEXT,
  p_stripe_terminal_enabled BOOLEAN,
  p_stripe_terminal_location_id TEXT
) RETURNS SETOF restaurant_payment_config AS $$
BEGIN
  -- Delete any existing entries first to avoid conflicts
  DELETE FROM restaurant_payment_config 
  WHERE restaurant_id = p_restaurant_id;
  
  -- Then insert the new configuration
  RETURN QUERY
  INSERT INTO restaurant_payment_config (
    restaurant_id,
    stripe_enabled,
    stripe_api_key,
    stripe_terminal_enabled,
    stripe_terminal_location_id
  ) VALUES (
    p_restaurant_id,
    p_stripe_enabled,
    p_stripe_api_key,
    p_stripe_terminal_enabled,
    p_stripe_terminal_location_id
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
