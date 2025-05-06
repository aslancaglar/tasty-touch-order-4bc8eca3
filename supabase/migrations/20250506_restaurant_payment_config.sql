
-- Create restaurant payment configuration table
CREATE TABLE IF NOT EXISTS public.restaurant_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stripe_enabled BOOLEAN DEFAULT false,
  stripe_api_key TEXT,
  stripe_terminal_enabled BOOLEAN DEFAULT false,
  stripe_terminal_location_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.restaurant_payment_config ENABLE ROW LEVEL SECURITY;

-- Create an edge function to securely update payment config
CREATE OR REPLACE FUNCTION update_restaurant_payment_config(
  p_restaurant_id UUID,
  p_stripe_enabled BOOLEAN,
  p_stripe_api_key TEXT,
  p_stripe_terminal_enabled BOOLEAN,
  p_stripe_terminal_location_id TEXT
) RETURNS SETOF restaurant_payment_config AS $$
BEGIN
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
  ON CONFLICT (restaurant_id) DO UPDATE SET
    stripe_enabled = p_stripe_enabled,
    stripe_api_key = p_stripe_api_key,
    stripe_terminal_enabled = p_stripe_terminal_enabled,
    stripe_terminal_location_id = p_stripe_terminal_location_id,
    updated_at = now()
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
