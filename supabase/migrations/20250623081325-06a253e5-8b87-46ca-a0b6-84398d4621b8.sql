
-- Comprehensive Security Migration: Consolidate RLS Policies and Fix Security Gaps
-- This migration removes all existing policies and creates a clean, standardized set

-- ========================================
-- DROP ALL EXISTING POLICIES TO START FRESH
-- ========================================

-- Restaurant print config policies
DROP POLICY IF EXISTS "Restaurant owners can manage their print config" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "Admins can manage all print configs" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "restaurant_print_config_owners_all_access" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "restaurant_print_config_admin_all_access" ON public.restaurant_print_config;

-- Restaurant printers policies
DROP POLICY IF EXISTS "Restaurant owners can manage their restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "Admins can manage all restaurant printers" ON public.restaurant_printers;
DROP POLICY IF EXISTS "restaurant_printers_owners_all_access" ON public.restaurant_printers;
DROP POLICY IF EXISTS "restaurant_printers_admin_all_access" ON public.restaurant_printers;

-- Restaurant tables policies
DROP POLICY IF EXISTS "Restaurant owners can manage their restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Admins can manage all restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_owners_all_access" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_admin_all_access" ON public.restaurant_tables;

-- Printer settings policies
DROP POLICY IF EXISTS "Restaurant owners can manage their printer settings" ON public.printer_settings;
DROP POLICY IF EXISTS "Admins can manage all printer settings" ON public.printer_settings;
DROP POLICY IF EXISTS "printer_settings_owners_all_access" ON public.printer_settings;
DROP POLICY IF EXISTS "printer_settings_admin_all_access" ON public.printer_settings;

-- Topping categories policies
DROP POLICY IF EXISTS "Restaurant owners can manage their topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Admins can manage all topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "Allow public SELECT for topping categories" ON public.topping_categories;
DROP POLICY IF EXISTS "topping_categories_public_select" ON public.topping_categories;
DROP POLICY IF EXISTS "topping_categories_owners_all_access" ON public.topping_categories;
DROP POLICY IF EXISTS "topping_categories_admin_all_access" ON public.topping_categories;

-- Toppings policies
DROP POLICY IF EXISTS "Restaurant owners can manage their toppings" ON public.toppings;
DROP POLICY IF EXISTS "Admins can manage all toppings" ON public.toppings;
DROP POLICY IF EXISTS "Allow public SELECT for toppings" ON public.toppings;
DROP POLICY IF EXISTS "toppings_public_select" ON public.toppings;
DROP POLICY IF EXISTS "toppings_owners_all_access" ON public.toppings;
DROP POLICY IF EXISTS "toppings_admin_all_access" ON public.toppings;

-- Menu item options policies
DROP POLICY IF EXISTS "Restaurant owners can manage their menu item options" ON public.menu_item_options;
DROP POLICY IF EXISTS "Admins can manage all menu item options" ON public.menu_item_options;
DROP POLICY IF EXISTS "Allow public SELECT for menu item options" ON public.menu_item_options;
DROP POLICY IF EXISTS "menu_item_options_public_select" ON public.menu_item_options;
DROP POLICY IF EXISTS "menu_item_options_owners_all_access" ON public.menu_item_options;
DROP POLICY IF EXISTS "menu_item_options_admin_all_access" ON public.menu_item_options;

-- Option choices policies
DROP POLICY IF EXISTS "Restaurant owners can manage their option choices" ON public.option_choices;
DROP POLICY IF EXISTS "Admins can manage all option choices" ON public.option_choices;
DROP POLICY IF EXISTS "Allow public SELECT for option choices" ON public.option_choices;
DROP POLICY IF EXISTS "option_choices_public_select" ON public.option_choices;
DROP POLICY IF EXISTS "option_choices_owners_all_access" ON public.option_choices;
DROP POLICY IF EXISTS "option_choices_admin_all_access" ON public.option_choices;

-- Menu item topping categories policies
DROP POLICY IF EXISTS "Restaurant owners can manage their menu item topping categories" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "Allow public SELECT for menu item topping categories" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "menu_item_topping_categories_public_select" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "menu_item_topping_categories_owners_all_access" ON public.menu_item_topping_categories;
DROP POLICY IF EXISTS "menu_item_topping_categories_admin_all_access" ON public.menu_item_topping_categories;

-- Order item toppings policies
DROP POLICY IF EXISTS "Kiosk can insert order item toppings only" ON public.order_item_toppings;
DROP POLICY IF EXISTS "Restaurant owners can manage their order item toppings" ON public.order_item_toppings;
DROP POLICY IF EXISTS "Admins can manage all order item toppings" ON public.order_item_toppings;
DROP POLICY IF EXISTS "order_item_toppings_admin_all_access" ON public.order_item_toppings;

-- Order item options policies
DROP POLICY IF EXISTS "Kiosk can insert order item options only" ON public.order_item_options;
DROP POLICY IF EXISTS "Restaurant owners can manage their order item options" ON public.order_item_options;
DROP POLICY IF EXISTS "Admins can manage all order item options" ON public.order_item_options;
DROP POLICY IF EXISTS "order_item_options_admin_all_access" ON public.order_item_options;

-- Payments policies
DROP POLICY IF EXISTS "Restaurant owners can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "payments_owners_select" ON public.payments;
DROP POLICY IF EXISTS "payments_admin_all_access" ON public.payments;

-- ========================================
-- CREATE STANDARDIZED POLICIES
-- ========================================

-- RESTAURANT PRINT CONFIG
CREATE POLICY "print_config_owners_manage" ON public.restaurant_print_config
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "print_config_admin_manage" ON public.restaurant_print_config
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- RESTAURANT PRINTERS
CREATE POLICY "printers_owners_manage" ON public.restaurant_printers
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "printers_admin_manage" ON public.restaurant_printers
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- RESTAURANT TABLES
CREATE POLICY "tables_owners_manage" ON public.restaurant_tables
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "tables_admin_manage" ON public.restaurant_tables
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- PRINTER SETTINGS
CREATE POLICY "printer_settings_owners_manage" ON public.printer_settings
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "printer_settings_admin_manage" ON public.printer_settings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- TOPPING CATEGORIES
CREATE POLICY "topping_categories_public_read" ON public.topping_categories
  FOR SELECT
  USING (true);

CREATE POLICY "topping_categories_owners_manage" ON public.topping_categories
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "topping_categories_admin_manage" ON public.topping_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- TOPPINGS
CREATE POLICY "toppings_public_read" ON public.toppings
  FOR SELECT
  USING (true);

CREATE POLICY "toppings_owners_manage" ON public.toppings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.topping_categories tc
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE tc.id = toppings.category_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topping_categories tc
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE tc.id = toppings.category_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "toppings_admin_manage" ON public.toppings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- MENU ITEM OPTIONS
CREATE POLICY "menu_item_options_public_read" ON public.menu_item_options
  FOR SELECT
  USING (true);

CREATE POLICY "menu_item_options_owners_manage" ON public.menu_item_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_options.menu_item_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_options.menu_item_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "menu_item_options_admin_manage" ON public.menu_item_options
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- OPTION CHOICES
CREATE POLICY "option_choices_public_read" ON public.option_choices
  FOR SELECT
  USING (true);

CREATE POLICY "option_choices_owners_manage" ON public.option_choices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_item_options mio
      JOIN public.menu_items mi ON mio.menu_item_id = mi.id
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mio.id = option_choices.option_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_item_options mio
      JOIN public.menu_items mi ON mio.menu_item_id = mi.id
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mio.id = option_choices.option_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "option_choices_admin_manage" ON public.option_choices
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- MENU ITEM TOPPING CATEGORIES
CREATE POLICY "menu_item_topping_categories_public_read" ON public.menu_item_topping_categories
  FOR SELECT
  USING (true);

CREATE POLICY "menu_item_topping_categories_owners_manage" ON public.menu_item_topping_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_topping_categories.menu_item_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_topping_categories.menu_item_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "menu_item_topping_categories_admin_manage" ON public.menu_item_topping_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- ORDER ITEM TOPPINGS (Adding missing restaurant owner access)
CREATE POLICY "order_item_toppings_kiosk_insert" ON public.order_item_toppings
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "order_item_toppings_owners_manage" ON public.order_item_toppings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_toppings.order_item_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_toppings.order_item_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "order_item_toppings_admin_manage" ON public.order_item_toppings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- ORDER ITEM OPTIONS (Adding missing restaurant owner access)
CREATE POLICY "order_item_options_kiosk_insert" ON public.order_item_options
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "order_item_options_owners_manage" ON public.order_item_options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_options.order_item_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE oi.id = order_item_options.order_item_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "order_item_options_admin_manage" ON public.order_item_options
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- PAYMENTS
CREATE POLICY "payments_owners_read" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE o.id = payments.order_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_admin_manage" ON public.payments
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());
