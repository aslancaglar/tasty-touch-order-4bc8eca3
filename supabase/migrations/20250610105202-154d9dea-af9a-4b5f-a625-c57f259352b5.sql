
-- Update RLS policies to use optimized auth function calls for better performance
-- This maintains the same security while improving query performance

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can view their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can view restaurants for kiosk" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can create restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can update all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners can update their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;

-- Recreate policies with optimized auth function calls
CREATE POLICY "Admins can view all restaurants" ON public.restaurants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
    AND is_admin = true
  )
);

CREATE POLICY "Owners can view their restaurants" ON public.restaurants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurants.id 
    AND user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Public can view restaurants for kiosk" ON public.restaurants
FOR SELECT USING (true);

CREATE POLICY "Admins can create restaurants" ON public.restaurants
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
    AND is_admin = true
  )
);

CREATE POLICY "Admins can update all restaurants" ON public.restaurants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
    AND is_admin = true
  )
);

CREATE POLICY "Owners can update their restaurants" ON public.restaurants
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurants.id 
    AND user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Admins can delete restaurants" ON public.restaurants
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (SELECT auth.uid()) 
    AND is_admin = true
  )
);
