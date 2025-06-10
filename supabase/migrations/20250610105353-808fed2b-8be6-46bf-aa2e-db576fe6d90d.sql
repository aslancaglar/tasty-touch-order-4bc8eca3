
-- Update RLS policies to use security definer functions for optimal performance
-- This avoids re-evaluating auth functions for each row

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can view their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view restaurants for kiosk" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can create restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can update all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can update their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;

-- Recreate policies using security definer functions for optimal performance
CREATE POLICY "Admins can view all restaurants" ON public.restaurants
FOR SELECT USING (public.is_current_user_admin());

CREATE POLICY "Owners can view their restaurants" ON public.restaurants
FOR SELECT USING (public.user_owns_restaurant(id));

CREATE POLICY "Public can view restaurants for kiosk" ON public.restaurants
FOR SELECT USING (true);

CREATE POLICY "Admins can create restaurants" ON public.restaurants
FOR INSERT WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update all restaurants" ON public.restaurants
FOR UPDATE USING (public.is_current_user_admin());

CREATE POLICY "Owners can update their restaurants" ON public.restaurants
FOR UPDATE USING (public.user_owns_restaurant(id));

CREATE POLICY "Admins can delete restaurants" ON public.restaurants
FOR DELETE USING (public.is_current_user_admin());
