
-- Phase 1: Critical RLS Policy Cleanup - Enhanced with existing policy removal
-- Remove ALL existing policies before creating new secure ones

-- Drop ALL existing policies on restaurant_print_config
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Owners can view their restaurant print config" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Owners can create their restaurant print config" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Owners can update their restaurant print config" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Admins can delete restaurant print config" ON public.restaurant_print_config;

-- Drop ALL existing policies on restaurant_tables
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can view their restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can create restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can update their restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admins can delete restaurant tables" ON public.restaurant_tables;

-- Drop ALL existing policies on restaurant_printers
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Owners can view their restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Owners can create restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Owners can update their restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Admins can delete restaurant printers" ON public.restaurant_printers;

-- Drop ALL existing policies on topping_categories
DROP POLICY IF EXISTS "Allow all operations" ON public.topping_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.topping_categories;
DROP POLICY IF EXISTS "Public can view topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Owners can create topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Owners can update topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Owners can delete topping categories" ON public.topping_categories;

-- Drop ALL existing policies on toppings
DROP POLICY IF EXISTS "Allow all operations" ON public.toppings;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.toppings;
DROP POLICY IF EXISTS "Public can view toppings" ON public.toppings;
DROP POLICY IF EXISTS "Owners can create toppings" ON public.toppings;
DROP POLICY IF EXISTS "Owners can update toppings" ON public.toppings;
DROP POLICY IF EXISTS "Owners can delete toppings" ON public.toppings;

-- Enable RLS on all tables (this is safe to run multiple times)
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;

-- Create helper function for topping categories (only if it doesn't exist)
CREATE OR REPLACE FUNCTION public.get_restaurant_from_topping_category(category_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT restaurant_id 
    FROM public.topping_categories 
    WHERE id = category_uuid
  );
END;
$$;

-- RESTAURANT PRINT CONFIG POLICIES
CREATE POLICY "Owners can view their restaurant print config" 
ON public.restaurant_print_config 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can create their restaurant print config" 
ON public.restaurant_print_config 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can update their restaurant print config" 
ON public.restaurant_print_config 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Admins can delete restaurant print config" 
ON public.restaurant_print_config 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT TABLES POLICIES
CREATE POLICY "Owners can view their restaurant tables" 
ON public.restaurant_tables 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can create restaurant tables" 
ON public.restaurant_tables 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can update their restaurant tables" 
ON public.restaurant_tables 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Admins can delete restaurant tables" 
ON public.restaurant_tables 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT PRINTERS POLICIES
CREATE POLICY "Owners can view their restaurant printers" 
ON public.restaurant_printers 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can create restaurant printers" 
ON public.restaurant_printers 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can update their restaurant printers" 
ON public.restaurant_printers 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Admins can delete restaurant printers" 
ON public.restaurant_printers 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- TOPPING CATEGORIES POLICIES
CREATE POLICY "Public can view topping categories" 
ON public.topping_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Owners can create topping categories" 
ON public.topping_categories 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can update topping categories" 
ON public.topping_categories 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can delete topping categories" 
ON public.topping_categories 
FOR DELETE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

-- TOPPINGS POLICIES
CREATE POLICY "Public can view toppings" 
ON public.toppings 
FOR SELECT 
USING (true);

CREATE POLICY "Owners can create toppings" 
ON public.toppings 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "Owners can update toppings" 
ON public.toppings 
FOR UPDATE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
)
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "Owners can delete toppings" 
ON public.toppings 
FOR DELETE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
);
