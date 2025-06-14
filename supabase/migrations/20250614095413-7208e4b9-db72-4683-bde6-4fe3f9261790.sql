
-- Create the missing security definer functions first
CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner_of_order(order_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
    WHERE o.id = order_id AND ro.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_restaurant_owner(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_restaurant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY(
    SELECT restaurant_id FROM public.restaurant_owners 
    WHERE user_id = auth.uid()
  );
$$;

-- Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.restaurants;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.restaurants;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public SELECT for restaurants" ON public.restaurants;

DROP POLICY IF EXISTS "Restaurant owners can manage their menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public SELECT for menu categories" ON public.menu_categories;

DROP POLICY IF EXISTS "Restaurant owners can manage their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public SELECT for menu items" ON public.menu_items;

DROP POLICY IF EXISTS "Public can read orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
DROP POLICY IF EXISTS "Kiosk can insert orders only" ON public.orders;
DROP POLICY IF EXISTS "Restaurant owners can manage their orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

DROP POLICY IF EXISTS "Kiosk can insert order items only" ON public.order_items;
DROP POLICY IF EXISTS "Restaurant owners can manage their order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

DROP POLICY IF EXISTS "Kiosk can insert order item toppings only" ON public.order_item_toppings;
DROP POLICY IF EXISTS "Restaurant owners can manage their order item toppings" ON public.order_item_toppings;

DROP POLICY IF EXISTS "Kiosk can insert order item options only" ON public.order_item_options;
DROP POLICY IF EXISTS "Restaurant owners can manage their order item options" ON public.order_item_options;

DROP POLICY IF EXISTS "Restaurant owners can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;

DROP POLICY IF EXISTS "Admins can manage restaurant owners" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Users can view their own restaurant ownership" ON public.restaurant_owners;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Restaurant owners can manage their restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Restaurant owners can manage their restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Restaurant owners can manage their print config" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Restaurant owners can manage their printer settings" ON public.printer_settings;

DROP POLICY IF EXISTS "Restaurant owners can manage their topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Restaurant owners can manage their toppings" ON public.toppings;
DROP POLICY IF EXISTS "Restaurant owners can manage their menu item options" ON public.menu_item_options;
DROP POLICY IF EXISTS "Restaurant owners can manage their option choices" ON public.option_choices;
DROP POLICY IF EXISTS "Restaurant owners can manage their menu item topping categories" ON public.menu_item_topping_categories;

DROP POLICY IF EXISTS "Admins can manage all restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admins can manage all restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Admins can manage all print configs" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Admins can manage all printer settings" ON public.printer_settings;
DROP POLICY IF EXISTS "Admins can manage all topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Admins can manage all toppings" ON public.toppings;
DROP POLICY IF EXISTS "Admins can manage all menu item options" ON public.menu_item_options;
DROP POLICY IF EXISTS "Admins can manage all option choices" ON public.option_choices;
DROP POLICY IF EXISTS "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories;

-- Enable RLS on all critical tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;

-- Create all the policies fresh
-- Restaurants table policies (public read, restricted write)
CREATE POLICY "Allow public SELECT for restaurants" ON public.restaurants
  FOR SELECT
  USING (true);

CREATE POLICY "Restaurant owners can update their restaurants" ON public.restaurants
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = restaurants.id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Menu categories table policies (public read, restricted write)
CREATE POLICY "Allow public SELECT for menu categories" ON public.menu_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Restaurant owners can manage their menu categories" ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = menu_categories.restaurant_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = menu_categories.restaurant_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all menu categories" ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Menu items table policies (public read, restricted write)
CREATE POLICY "Allow public SELECT for menu items" ON public.menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "Restaurant owners can manage their menu items" ON public.menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_items.category_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_items.category_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all menu items" ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- ORDERS TABLE POLICIES (Most Critical - kiosk can only insert, owners can manage their own)
CREATE POLICY "Kiosk can insert orders only" ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Restaurant owners can manage their orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = orders.restaurant_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_owners ro 
      WHERE ro.restaurant_id = orders.restaurant_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- ORDER_ITEMS POLICIES
CREATE POLICY "Kiosk can insert order items only" ON public.order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Restaurant owners can manage their order items" ON public.order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE o.id = order_items.order_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE o.id = order_items.order_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Remaining policies for secure operation
CREATE POLICY "Kiosk can insert order item toppings only" ON public.order_item_toppings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Restaurant owners can manage their order item toppings" ON public.order_item_toppings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_toppings.order_item_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Kiosk can insert order item options only" ON public.order_item_options
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Restaurant owners can manage their order item options" ON public.order_item_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_options.order_item_id AND ro.user_id = auth.uid()
    )
  );

-- SECURE PROFILE ACCESS
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- RESTAURANT OWNERSHIP POLICIES
CREATE POLICY "Admins can manage restaurant owners" ON public.restaurant_owners
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Users can view their own restaurant ownership" ON public.restaurant_owners
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
