
-- Fix the missing get_current_user_admin_status function that's being called but doesn't exist
-- This function is critical for admin authorization checks
CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Create audit_logs table for comprehensive security logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  resource_type TEXT,
  resource_id TEXT,
  action TEXT,
  details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- System can insert audit logs (for security monitoring)
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Create security_violations table for tracking security incidents
CREATE TABLE IF NOT EXISTS public.security_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security_violations
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create new one
DROP POLICY IF EXISTS "Admins can manage security violations" ON public.security_violations;

-- Only admins can access security violations
CREATE POLICY "Admins can manage security violations" ON public.security_violations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Add RLS policies to critical tables that are missing them
-- Enable RLS on all tables first
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Restaurant owners can manage their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view restaurants for kiosk" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can manage menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Public can view menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Restaurant owners can manage menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Restaurant owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create new policies
CREATE POLICY "Restaurant owners can manage their restaurants" ON public.restaurants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.restaurant_owners WHERE restaurant_id = restaurants.id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Public can view restaurants for kiosk" ON public.restaurants
  FOR SELECT USING (true);

CREATE POLICY "Restaurant owners can manage menu categories" ON public.menu_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = menu_categories.restaurant_id 
      AND ro.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Public can view menu categories" ON public.menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Restaurant owners can manage menu items" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      JOIN public.menu_categories mc ON ro.restaurant_id = mc.restaurant_id
      WHERE mc.id = menu_items.category_id 
      AND ro.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Public can view menu items" ON public.menu_items
  FOR SELECT USING (true);

CREATE POLICY "Restaurant owners can manage orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = orders.restaurant_id 
      AND ro.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Create helper functions for security checks
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(restaurant_uuid UUID)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;
