
-- Fix critical security vulnerabilities in RLS policies
-- Remove overly permissive policies and implement proper access controls

-- First, drop all existing policies systematically
DO $$
BEGIN
    -- Drop existing profiles policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

    -- Drop existing restaurant policies
    DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can view their restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can update their restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Public can view restaurants for kiosk" ON public.restaurants;
    DROP POLICY IF EXISTS "Admins can manage restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can view owned restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can update owned restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Public kiosk read access" ON public.restaurants;

    -- Drop existing restaurant owners policies
    DROP POLICY IF EXISTS "Admins can manage restaurant owners" ON public.restaurant_owners;
    DROP POLICY IF EXISTS "Owners can view their ownerships" ON public.restaurant_owners;
    DROP POLICY IF EXISTS "Admins can manage restaurant ownership" ON public.restaurant_owners;
    DROP POLICY IF EXISTS "Users can view own restaurant ownership" ON public.restaurant_owners;

    -- Drop existing menu categories policies
    DROP POLICY IF EXISTS "Admins can manage all categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Owners can manage their restaurant categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Public can view categories for kiosk" ON public.menu_categories;
    DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Owners can manage owned restaurant categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Public can view menu categories" ON public.menu_categories;

    -- Drop existing menu items policies
    DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Owners can manage their restaurant menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Public can view menu items for kiosk" ON public.menu_items;
    DROP POLICY IF EXISTS "Owners can manage owned menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;

    -- Drop existing menu item options policies
    DROP POLICY IF EXISTS "Admins can manage all menu item options" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Owners can manage their menu item options" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Public can view menu item options for kiosk" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Owners can manage owned menu item options" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Public can view menu item options" ON public.menu_item_options;

    -- Drop existing option choices policies
    DROP POLICY IF EXISTS "Admins can manage all option choices" ON public.option_choices;
    DROP POLICY IF EXISTS "Owners can manage their option choices" ON public.option_choices;
    DROP POLICY IF EXISTS "Public can view option choices for kiosk" ON public.option_choices;
    DROP POLICY IF EXISTS "Owners can manage owned option choices" ON public.option_choices;
    DROP POLICY IF EXISTS "Public can view option choices" ON public.option_choices;

    -- Drop existing topping categories policies
    DROP POLICY IF EXISTS "Admins can manage all topping categories" ON public.topping_categories;
    DROP POLICY IF EXISTS "Owners can manage their topping categories" ON public.topping_categories;
    DROP POLICY IF EXISTS "Public can view topping categories for kiosk" ON public.topping_categories;
    DROP POLICY IF EXISTS "Owners can manage owned topping categories" ON public.topping_categories;
    DROP POLICY IF EXISTS "Public can view topping categories" ON public.topping_categories;

    -- Drop existing toppings policies
    DROP POLICY IF EXISTS "Admins can manage all toppings" ON public.toppings;
    DROP POLICY IF EXISTS "Owners can manage their toppings" ON public.toppings;
    DROP POLICY IF EXISTS "Public can view toppings for kiosk" ON public.toppings;
    DROP POLICY IF EXISTS "Owners can manage owned toppings" ON public.toppings;
    DROP POLICY IF EXISTS "Public can view toppings" ON public.toppings;

    -- Drop existing menu item topping categories policies
    DROP POLICY IF EXISTS "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Owners can manage their menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Public can view menu item topping categories for kiosk" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Admins can manage menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Owners can manage owned menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Public can view menu item topping categories" ON public.menu_item_topping_categories;

    -- Drop existing orders policies
    DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
    DROP POLICY IF EXISTS "Owners can manage their restaurant orders" ON public.orders;
    DROP POLICY IF EXISTS "Public can create orders for kiosk" ON public.orders;
    DROP POLICY IF EXISTS "Owners can manage restaurant orders" ON public.orders;
    DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

    -- Drop existing order items policies
    DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
    DROP POLICY IF EXISTS "Owners can manage their restaurant order items" ON public.order_items;
    DROP POLICY IF EXISTS "Public can create order items for kiosk" ON public.order_items;
    DROP POLICY IF EXISTS "Owners can manage restaurant order items" ON public.order_items;
    DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;

    -- Drop existing order item options policies
    DROP POLICY IF EXISTS "Admins can manage all order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Owners can manage their order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Public can create order item options for kiosk" ON public.order_item_options;
    DROP POLICY IF EXISTS "Admins can manage order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Owners can manage restaurant order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Public can create order item options" ON public.order_item_options;

    -- Drop existing order item toppings policies
    DROP POLICY IF EXISTS "Admins can manage all order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Owners can manage their order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Public can create order item toppings for kiosk" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Admins can manage order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Owners can manage restaurant order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Public can create order item toppings" ON public.order_item_toppings;

    -- Drop existing additional table policies
    DROP POLICY IF EXISTS "Admins can manage print config" ON public.restaurant_print_config;
    DROP POLICY IF EXISTS "Owners can manage their print config" ON public.restaurant_print_config;
    DROP POLICY IF EXISTS "Admins can manage printer settings" ON public.printer_settings;
    DROP POLICY IF EXISTS "Owners can manage their printer settings" ON public.printer_settings;
    DROP POLICY IF EXISTS "Admins can manage restaurant tables" ON public.restaurant_tables;
    DROP POLICY IF EXISTS "Owners can manage their restaurant tables" ON public.restaurant_tables;
    DROP POLICY IF EXISTS "Public can view restaurant tables" ON public.restaurant_tables;
    DROP POLICY IF EXISTS "Admins can manage restaurant printers" ON public.restaurant_printers;
    DROP POLICY IF EXISTS "Owners can manage their restaurant printers" ON public.restaurant_printers;
    DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
    DROP POLICY IF EXISTS "Owners can manage restaurant payments" ON public.payments;
    DROP POLICY IF EXISTS "Public can create payments" ON public.payments;
END $$;

-- Enable RLS on tables that might not have it
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create new secure policies

-- Profiles policies - restrict to user's own profile only
CREATE POLICY "secure_profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "secure_profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "secure_profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_current_user_admin());

-- Restaurant policies - separate admin management from public kiosk access
CREATE POLICY "secure_restaurants_admin_manage" ON public.restaurants
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_restaurants_owner_select" ON public.restaurants
  FOR SELECT USING (public.user_owns_restaurant(id));

CREATE POLICY "secure_restaurants_owner_update" ON public.restaurants
  FOR UPDATE USING (public.user_owns_restaurant(id));

CREATE POLICY "secure_restaurants_public_select" ON public.restaurants
  FOR SELECT USING (true);

-- Restaurant owners policies - strict ownership control
CREATE POLICY "secure_restaurant_owners_admin" ON public.restaurant_owners
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_restaurant_owners_own" ON public.restaurant_owners
  FOR SELECT USING (user_id = auth.uid());

-- Menu categories - secure ownership and public read access
CREATE POLICY "secure_categories_admin" ON public.menu_categories
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_categories_owner" ON public.menu_categories
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_categories_public" ON public.menu_categories
  FOR SELECT USING (true);

-- Menu items - secure ownership and public read access
CREATE POLICY "secure_menu_items_admin" ON public.menu_items
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_menu_items_owner" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      WHERE mc.id = menu_items.category_id
      AND public.user_owns_restaurant(mc.restaurant_id)
    )
  );

CREATE POLICY "secure_menu_items_public" ON public.menu_items
  FOR SELECT USING (true);

-- Menu item options - secure ownership and public read access
CREATE POLICY "secure_menu_options_admin" ON public.menu_item_options
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_menu_options_owner" ON public.menu_item_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = menu_item_options.menu_item_id
      AND public.user_owns_restaurant(mc.restaurant_id)
    )
  );

CREATE POLICY "secure_menu_options_public" ON public.menu_item_options
  FOR SELECT USING (true);

-- Option choices - secure ownership and public read access
CREATE POLICY "secure_option_choices_admin" ON public.option_choices
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_option_choices_owner" ON public.option_choices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_item_options mio
      JOIN public.menu_items mi ON mio.menu_item_id = mi.id
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      WHERE mio.id = option_choices.option_id
      AND public.user_owns_restaurant(mc.restaurant_id)
    )
  );

CREATE POLICY "secure_option_choices_public" ON public.option_choices
  FOR SELECT USING (true);

-- Topping categories - secure ownership and public read access
CREATE POLICY "secure_topping_categories_admin" ON public.topping_categories
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_topping_categories_owner" ON public.topping_categories
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_topping_categories_public" ON public.topping_categories
  FOR SELECT USING (true);

-- Toppings - secure ownership and public read access
CREATE POLICY "secure_toppings_admin" ON public.toppings
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_toppings_owner" ON public.toppings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.topping_categories tc
      WHERE tc.id = toppings.category_id
      AND public.user_owns_restaurant(tc.restaurant_id)
    )
  );

CREATE POLICY "secure_toppings_public" ON public.toppings
  FOR SELECT USING (true);

-- Menu item topping categories - secure ownership and public read access
CREATE POLICY "secure_menu_topping_cats_admin" ON public.menu_item_topping_categories
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_menu_topping_cats_owner" ON public.menu_item_topping_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      WHERE mi.id = menu_item_topping_categories.menu_item_id
      AND public.user_owns_restaurant(mc.restaurant_id)
    )
  );

CREATE POLICY "secure_menu_topping_cats_public" ON public.menu_item_topping_categories
  FOR SELECT USING (true);

-- Orders - secure access for admins/owners, limited public access for kiosk
CREATE POLICY "secure_orders_admin" ON public.orders
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_orders_owner" ON public.orders
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_orders_public_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Order items - secure access for admins/owners, limited public access for kiosk
CREATE POLICY "secure_order_items_admin" ON public.order_items
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_order_items_owner" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.user_owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "secure_order_items_public_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Order item options - secure access for admins/owners, limited public access for kiosk
CREATE POLICY "secure_order_options_admin" ON public.order_item_options
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_order_options_owner" ON public.order_item_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      WHERE oi.id = order_item_options.order_item_id
      AND public.user_owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "secure_order_options_public_insert" ON public.order_item_options
  FOR INSERT WITH CHECK (true);

-- Order item toppings - secure access for admins/owners, limited public access for kiosk
CREATE POLICY "secure_order_toppings_admin" ON public.order_item_toppings
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_order_toppings_owner" ON public.order_item_toppings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      WHERE oi.id = order_item_toppings.order_item_id
      AND public.user_owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "secure_order_toppings_public_insert" ON public.order_item_toppings
  FOR INSERT WITH CHECK (true);

-- Secure policies for restaurant-specific tables
CREATE POLICY "secure_print_config_admin" ON public.restaurant_print_config
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_print_config_owner" ON public.restaurant_print_config
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_printer_settings_admin" ON public.printer_settings
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_printer_settings_owner" ON public.printer_settings
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_restaurant_tables_admin" ON public.restaurant_tables
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_restaurant_tables_owner" ON public.restaurant_tables
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_restaurant_tables_public" ON public.restaurant_tables
  FOR SELECT USING (true);

CREATE POLICY "secure_restaurant_printers_admin" ON public.restaurant_printers
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_restaurant_printers_owner" ON public.restaurant_printers
  FOR ALL USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "secure_payments_admin" ON public.payments
  FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "secure_payments_owner" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payments.order_id
      AND public.user_owns_restaurant(o.restaurant_id)
    )
  );

CREATE POLICY "secure_payments_public_insert" ON public.payments
  FOR INSERT WITH CHECK (true);
