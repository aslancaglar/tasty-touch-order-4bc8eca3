
-- Phase 1: Critical RLS Policy Cleanup - Complete Implementation
-- Remove ALL existing conflicting and overly permissive policies

-- Drop ALL existing policies on menu_categories
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

-- Drop ALL existing policies on order_items
DROP POLICY IF EXISTS "Allow all operations" ON public.order_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_items;
DROP POLICY IF EXISTS "Owners can view their restaurant order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Owners and admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

-- Drop ALL existing policies on orders
DROP POLICY IF EXISTS "Allow all operations" ON public.orders;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.orders;
DROP POLICY IF EXISTS "Owners can view their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Owners and admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

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

-- Ensure RLS is enabled on all tables
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;

-- Recreate secure RLS policies

-- MENU CATEGORIES POLICIES
CREATE POLICY "Public can view menu categories" 
ON public.menu_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Owners and admins can create menu categories" 
ON public.menu_categories 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners and admins can update menu categories" 
ON public.menu_categories 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

CREATE POLICY "Owners and admins can delete menu categories" 
ON public.menu_categories 
FOR DELETE 
TO authenticated
USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());

-- MENU ITEMS POLICIES
CREATE POLICY "Public can view menu items" 
ON public.menu_items 
FOR SELECT 
USING (true);

CREATE POLICY "Owners and admins can create menu items" 
ON public.menu_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "Owners and admins can update menu items" 
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

CREATE POLICY "Owners and admins can delete menu items" 
ON public.menu_items 
FOR DELETE 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) 
  OR public.is_admin_secure()
);

-- ORDERS POLICIES
CREATE POLICY "Owners can view their restaurant orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(restaurant_id) 
  OR public.is_admin_secure()
);

CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Owners and admins can update orders" 
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

CREATE POLICY "Admins can delete orders" 
ON public.orders 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- ORDER ITEMS POLICIES
CREATE POLICY "Owners can view their restaurant order items" 
ON public.order_items 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "Anyone can create order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Owners and admins can update order items" 
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

CREATE POLICY "Admins can delete order items" 
ON public.order_items 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

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
