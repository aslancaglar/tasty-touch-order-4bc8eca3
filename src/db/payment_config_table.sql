
-- Create payment configuration table for restaurants
CREATE TABLE IF NOT EXISTS public.restaurant_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stripe_enabled BOOLEAN NOT NULL DEFAULT false,
  stripe_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id)
);

-- Enable Row Level Security
ALTER TABLE public.restaurant_payment_config ENABLE ROW LEVEL SECURITY;

-- Create policy for restaurant owners
CREATE POLICY "restaurant_owners_can_manage_payment_config"
  ON public.restaurant_payment_config
  USING (restaurant_id IN (
    SELECT restaurant_id FROM restaurant_users 
    WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'admin')
  ));

-- Create policy for admin to manage all payment configs
CREATE POLICY "admins_can_manage_all_payment_configs"
  ON public.restaurant_payment_config
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND auth.uid() IN (SELECT user_id FROM public.admin_users)
    )
  );
