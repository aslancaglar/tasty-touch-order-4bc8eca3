
-- Phase 1: Critical RLS Policy Cleanup
-- Remove dangerous "Allow all operations" policies and consolidate conflicting ones

-- First, drop all existing overly permissive policies on tables that currently lack proper RLS
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_items;
DROP POLICY IF EXISTS "Allow all operations" ON public.order_items;
DROP POLICY IF EXISTS "Allow all operations" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Allow all operations" ON public.topping_categories;
DROP POLICY IF EXISTS "Allow all operations" ON public.toppings;

-- Drop any other permissive policies that might exist
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.topping_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.toppings;

-- Enable RLS on all tables that need it
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

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

-- PRINTER SETTINGS POLICIES (NEW - was missing proper RLS)
CREATE POLICY "Owners can view their printer settings" 
ON public.printer_settings 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can create printer settings" 
ON public.printer_settings 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners can update their printer settings" 
ON public.printer_settings 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Admins can delete printer settings" 
ON public.printer_settings 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());
