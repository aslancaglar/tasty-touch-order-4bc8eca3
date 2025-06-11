
-- Phase 1: Critical RLS Policy Cleanup - Complete Security Fix Implementation
-- This migration addresses all the security vulnerabilities identified in the security review

-- First, let's clean up ALL existing conflicting policies across all tables
-- This prevents the security bypasses caused by conflicting policies

-- Drop ALL existing policies on menu_categories (including any variants)
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_categories;
DROP POLICY IF EXISTS "Public can view menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can create menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can update menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can delete menu categories" ON public.menu_categories;

-- Drop ALL existing policies on menu_items
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can create menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can delete menu items" ON public.menu_items;

-- Drop ALL existing policies on orders
DROP POLICY IF EXISTS "Allow all operations" ON public.orders;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.orders;
DROP POLICY IF EXISTS "Owners can view their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Owners and admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

-- Drop ALL existing policies on order_items
DROP POLICY IF EXISTS "Allow all operations" ON public.order_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_items;
DROP POLICY IF EXISTS "Owners can view their restaurant order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Owners and admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

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

-- Drop ALL existing policies on restaurant_api_keys
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Owners can view their restaurant API keys" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Owners can create API keys for their restaurants" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Owners can update their restaurant API keys" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Owners can delete their restaurant API keys" ON public.restaurant_api_keys;

-- Ensure RLS is enabled on ALL sensitive tables
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_api_keys ENABLE ROW LEVEL SECURITY;

-- Ensure all security definer functions exist with proper security
CREATE OR REPLACE FUNCTION public.is_restaurant_owner_secure(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid 
    AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_secure()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_restaurant_from_category(category_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT restaurant_id 
    FROM public.menu_categories 
    WHERE id = category_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_restaurant_from_order(order_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT restaurant_id 
    FROM public.orders 
    WHERE id = order_uuid
  );
END;
$$;

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

-- Now create the SECURE, NON-CONFLICTING RLS policies

-- MENU CATEGORIES - Secure policies
CREATE POLICY "menu_categories_public_select" 
ON public.menu_categories 
FOR SELECT 
USING (true);

CREATE POLICY "menu_categories_owner_admin_insert" 
ON public.menu_categories 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "menu_categories_owner_admin_update" 
ON public.menu_categories 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "menu_categories_owner_admin_delete" 
ON public.menu_categories 
FOR DELETE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

-- MENU ITEMS - Secure policies
CREATE POLICY "menu_items_public_select" 
ON public.menu_items 
FOR SELECT 
USING (true);

CREATE POLICY "menu_items_owner_admin_insert" 
ON public.menu_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "menu_items_owner_admin_update" 
ON public.menu_items 
FOR UPDATE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
)
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "menu_items_owner_admin_delete" 
ON public.menu_items 
FOR DELETE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
);

-- ORDERS - Secure policies
CREATE POLICY "orders_owner_admin_select" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(restaurant_id) 
  OR public.is_admin_secure()
);

CREATE POLICY "orders_public_insert" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "orders_owner_admin_update" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(restaurant_id) 
  OR public.is_admin_secure()
)
WITH CHECK (
  public.is_restaurant_owner_secure(restaurant_id) 
  OR public.is_admin_secure()
);

CREATE POLICY "orders_admin_delete" 
ON public.orders 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- ORDER ITEMS - Secure policies
CREATE POLICY "order_items_owner_admin_select" 
ON public.order_items 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "order_items_public_insert" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "order_items_owner_admin_update" 
ON public.order_items 
FOR UPDATE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) 
  OR public.is_admin_secure()
)
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "order_items_admin_delete" 
ON public.order_items 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- TOPPING CATEGORIES - Secure policies
CREATE POLICY "topping_categories_public_select" 
ON public.topping_categories 
FOR SELECT 
USING (true);

CREATE POLICY "topping_categories_owner_admin_insert" 
ON public.topping_categories 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "topping_categories_owner_admin_update" 
ON public.topping_categories 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "topping_categories_owner_admin_delete" 
ON public.topping_categories 
FOR DELETE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

-- TOPPINGS - Secure policies
CREATE POLICY "toppings_public_select" 
ON public.toppings 
FOR SELECT 
USING (true);

CREATE POLICY "toppings_owner_admin_insert" 
ON public.toppings 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "toppings_owner_admin_update" 
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

CREATE POLICY "toppings_owner_admin_delete" 
ON public.toppings 
FOR DELETE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) 
  OR public.is_admin_secure()
);

-- RESTAURANT PRINT CONFIG - Secure policies
CREATE POLICY "restaurant_print_config_owner_admin_select" 
ON public.restaurant_print_config 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_print_config_owner_admin_insert" 
ON public.restaurant_print_config 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_print_config_owner_admin_update" 
ON public.restaurant_print_config 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_print_config_admin_delete" 
ON public.restaurant_print_config 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT TABLES - Secure policies
CREATE POLICY "restaurant_tables_owner_admin_select" 
ON public.restaurant_tables 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_tables_owner_admin_insert" 
ON public.restaurant_tables 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_tables_owner_admin_update" 
ON public.restaurant_tables 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_tables_admin_delete" 
ON public.restaurant_tables 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT PRINTERS - Secure policies
CREATE POLICY "restaurant_printers_owner_admin_select" 
ON public.restaurant_printers 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_printers_owner_admin_insert" 
ON public.restaurant_printers 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_printers_owner_admin_update" 
ON public.restaurant_printers 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_printers_admin_delete" 
ON public.restaurant_printers 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT API KEYS - Secure policies (CRITICAL for API key security)
CREATE POLICY "restaurant_api_keys_owner_admin_select" 
ON public.restaurant_api_keys 
FOR SELECT 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_api_keys_owner_admin_insert" 
ON public.restaurant_api_keys 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_api_keys_owner_admin_update" 
ON public.restaurant_api_keys 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "restaurant_api_keys_owner_admin_delete" 
ON public.restaurant_api_keys 
FOR DELETE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

-- Security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(event_type text, event_data jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log security events for monitoring
  INSERT INTO public.security_audit_log (
    user_id, 
    event_type, 
    event_data, 
    created_at
  ) VALUES (
    auth.uid(), 
    event_type, 
    event_data, 
    now()
  );
EXCEPTION WHEN others THEN
  -- Fail silently to not break application flow
  NULL;
END;
$$;

-- Create security audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "security_audit_log_admin_select" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (public.is_admin_secure());

CREATE POLICY "security_audit_log_system_insert" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);
