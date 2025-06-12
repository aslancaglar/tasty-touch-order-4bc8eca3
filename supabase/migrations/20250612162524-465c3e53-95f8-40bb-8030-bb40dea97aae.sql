
-- EMERGENCY RLS POLICY FIX - Phase 2: Handle existing policies and create missing ones
-- This migration addresses the catastrophic RLS policy failures with proper conflict handling

-- First, drop all dangerous "Allow all operations" policies that grant public access (if they exist)
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_items;
DROP POLICY IF EXISTS "Allow all operations" ON public.order_items;
DROP POLICY IF EXISTS "Allow all operations" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Allow all operations" ON public.topping_categories;
DROP POLICY IF EXISTS "Allow all operations" ON public.toppings;
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_item_options;
DROP POLICY IF EXISTS "Allow all operations" ON public.option_choices;
DROP POLICY IF EXISTS "Allow all operations" ON public.order_item_options;
DROP POLICY IF EXISTS "Allow all operations" ON public.order_item_toppings;
DROP POLICY IF EXISTS "Allow all operations" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Allow all operations" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Allow all operations" ON public.payments;

-- Drop other variations of permissive policies
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_items;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.orders;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.topping_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.toppings;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_item_options;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.option_choices;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_item_options;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.order_item_toppings;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.payments;

-- Drop dangerous API key policies
DROP POLICY IF EXISTS "Anyone can view restaurant API keys" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Anyone can create API keys for restaurants" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Anyone can update restaurant API keys" ON public.restaurant_api_keys;
DROP POLICY IF EXISTS "Anyone can delete restaurant API keys" ON public.restaurant_api_keys;

-- Enable RLS on all critical tables (safe to run multiple times)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- CREATE SECURE RLS POLICIES (Only if they don't exist)

-- RESTAURANTS - Skip if policies already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Admins can manage all restaurants') THEN
    CREATE POLICY "Admins can manage all restaurants" 
    ON public.restaurants 
    FOR ALL 
    TO authenticated
    USING (public.is_admin_secure())
    WITH CHECK (public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurants' AND policyname = 'Owners can manage their restaurants') THEN
    CREATE POLICY "Owners can manage their restaurants" 
    ON public.restaurants 
    FOR ALL 
    TO authenticated
    USING (public.is_restaurant_owner_secure(id))
    WITH CHECK (public.is_restaurant_owner_secure(id));
  END IF;
END $$;

-- MENU CATEGORIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_categories' AND policyname = 'Public can view menu categories') THEN
    CREATE POLICY "Public can view menu categories" 
    ON public.menu_categories 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_categories' AND policyname = 'Owners can manage their menu categories') THEN
    CREATE POLICY "Owners can manage their menu categories" 
    ON public.menu_categories 
    FOR ALL 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;
END $$;

-- MENU ITEMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Public can view menu items') THEN
    CREATE POLICY "Public can view menu items" 
    ON public.menu_items 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_items' AND policyname = 'Owners can manage menu items') THEN
    CREATE POLICY "Owners can manage menu items" 
    ON public.menu_items 
    FOR ALL 
    TO authenticated
    USING (public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(public.get_restaurant_from_category(category_id)) OR public.is_admin_secure());
  END IF;
END $$;

-- MENU ITEM OPTIONS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item_options' AND policyname = 'Public can view menu item options') THEN
    CREATE POLICY "Public can view menu item options" 
    ON public.menu_item_options 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item_options' AND policyname = 'Owners can manage menu item options') THEN
    CREATE POLICY "Owners can manage menu item options" 
    ON public.menu_item_options 
    FOR ALL 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.menu_items mi 
        WHERE mi.id = menu_item_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.menu_items mi 
        WHERE mi.id = menu_item_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    );
  END IF;
END $$;

-- OPTION CHOICES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'option_choices' AND policyname = 'Public can view option choices') THEN
    CREATE POLICY "Public can view option choices" 
    ON public.option_choices 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'option_choices' AND policyname = 'Owners can manage option choices') THEN
    CREATE POLICY "Owners can manage option choices" 
    ON public.option_choices 
    FOR ALL 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.menu_item_options mio 
        JOIN public.menu_items mi ON mio.menu_item_id = mi.id
        WHERE mio.id = option_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.menu_item_options mio 
        JOIN public.menu_items mi ON mio.menu_item_id = mi.id
        WHERE mio.id = option_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    );
  END IF;
END $$;

-- TOPPING CATEGORIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topping_categories' AND policyname = 'Public can view topping categories') THEN
    CREATE POLICY "Public can view topping categories" 
    ON public.topping_categories 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topping_categories' AND policyname = 'Owners can manage topping categories') THEN
    CREATE POLICY "Owners can manage topping categories" 
    ON public.topping_categories 
    FOR ALL 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;
END $$;

-- TOPPINGS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'toppings' AND policyname = 'Public can view toppings') THEN
    CREATE POLICY "Public can view toppings" 
    ON public.toppings 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'toppings' AND policyname = 'Owners can manage toppings') THEN
    CREATE POLICY "Owners can manage toppings" 
    ON public.toppings 
    FOR ALL 
    TO authenticated
    USING (public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(public.get_restaurant_from_topping_category(category_id)) OR public.is_admin_secure());
  END IF;
END $$;

-- MENU ITEM TOPPING CATEGORIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item_topping_categories' AND policyname = 'Public can view menu item topping categories') THEN
    CREATE POLICY "Public can view menu item topping categories" 
    ON public.menu_item_topping_categories 
    FOR SELECT 
    TO public
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'menu_item_topping_categories' AND policyname = 'Owners can manage menu item topping categories') THEN
    CREATE POLICY "Owners can manage menu item topping categories" 
    ON public.menu_item_topping_categories 
    FOR ALL 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.menu_items mi 
        WHERE mi.id = menu_item_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.menu_items mi 
        WHERE mi.id = menu_item_id 
        AND (public.is_restaurant_owner_secure(public.get_restaurant_from_category(mi.category_id)) OR public.is_admin_secure())
      )
    );
  END IF;
END $$;

-- ORDERS - Restricted access, only owners and admins
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Owners can view their restaurant orders') THEN
    CREATE POLICY "Owners can view their restaurant orders" 
    ON public.orders 
    FOR SELECT 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Authenticated users can create orders') THEN
    CREATE POLICY "Authenticated users can create orders" 
    ON public.orders 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Owners can update their restaurant orders') THEN
    CREATE POLICY "Owners can update their restaurant orders" 
    ON public.orders 
    FOR UPDATE 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admins can delete orders') THEN
    CREATE POLICY "Admins can delete orders" 
    ON public.orders 
    FOR DELETE 
    TO authenticated
    USING (public.is_admin_secure());
  END IF;
END $$;

-- ORDER ITEMS - Restricted access, only owners and admins
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Owners can view order items for their restaurants') THEN
    CREATE POLICY "Owners can view order items for their restaurants" 
    ON public.order_items 
    FOR SELECT 
    TO authenticated
    USING (public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Authenticated users can create order items') THEN
    CREATE POLICY "Authenticated users can create order items" 
    ON public.order_items 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Owners can update order items for their restaurants') THEN
    CREATE POLICY "Owners can update order items for their restaurants" 
    ON public.order_items 
    FOR UPDATE 
    TO authenticated
    USING (public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admins can delete order items') THEN
    CREATE POLICY "Admins can delete order items" 
    ON public.order_items 
    FOR DELETE 
    TO authenticated
    USING (public.is_admin_secure());
  END IF;
END $$;

-- RESTAURANT API KEYS - Critical security policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_api_keys' AND policyname = 'Owners can view their restaurant API keys') THEN
    CREATE POLICY "Owners can view their restaurant API keys" 
    ON public.restaurant_api_keys 
    FOR SELECT 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_api_keys' AND policyname = 'Owners can create API keys for their restaurants') THEN
    CREATE POLICY "Owners can create API keys for their restaurants" 
    ON public.restaurant_api_keys 
    FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_api_keys' AND policyname = 'Owners can update their restaurant API keys') THEN
    CREATE POLICY "Owners can update their restaurant API keys" 
    ON public.restaurant_api_keys 
    FOR UPDATE 
    TO authenticated
    USING (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure())
    WITH CHECK (public.is_restaurant_owner_secure(restaurant_id) OR public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_api_keys' AND policyname = 'Admins can delete restaurant API keys') THEN
    CREATE POLICY "Admins can delete restaurant API keys" 
    ON public.restaurant_api_keys 
    FOR DELETE 
    TO authenticated
    USING (public.is_admin_secure());
  END IF;
END $$;

-- RESTAURANT OWNERS - Highly restricted, admin only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_owners' AND policyname = 'Admins can manage restaurant owners') THEN
    CREATE POLICY "Admins can manage restaurant owners" 
    ON public.restaurant_owners 
    FOR ALL 
    TO authenticated
    USING (public.is_admin_secure())
    WITH CHECK (public.is_admin_secure());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restaurant_owners' AND policyname = 'Users can view their own restaurant ownerships') THEN
    CREATE POLICY "Users can view their own restaurant ownerships" 
    ON public.restaurant_owners 
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- PROFILES policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
    CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated
    USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can view all profiles') THEN
    CREATE POLICY "Admins can view all profiles" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated
    USING (public.is_admin_secure());
  END IF;
END $$;

-- PAYMENTS - Highly restricted
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Owners can view payments for their restaurants') THEN
    CREATE POLICY "Owners can view payments for their restaurants" 
    ON public.payments 
    FOR SELECT 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id 
        AND (public.is_restaurant_owner_secure(o.restaurant_id) OR public.is_admin_secure())
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Authenticated users can create payments') THEN
    CREATE POLICY "Authenticated users can create payments" 
    ON public.payments 
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Owners can update payments for their restaurants') THEN
    CREATE POLICY "Owners can update payments for their restaurants" 
    ON public.payments 
    FOR UPDATE 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id 
        AND (public.is_restaurant_owner_secure(o.restaurant_id) OR public.is_admin_secure())
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id 
        AND (public.is_restaurant_owner_secure(o.restaurant_id) OR public.is_admin_secure())
      )
    );
  END IF;
END $$;
