
-- Complete security migration to fix RLS policies and add missing policies

-- First, create all missing policies for tables that currently have none

-- Restaurant tables policies - these were missing
CREATE POLICY "Restaurant owners can manage their restaurant tables" ON public.restaurant_tables
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Admins can manage all restaurant tables" ON public.restaurant_tables
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Restaurant printers policies - these were missing  
CREATE POLICY "Restaurant owners can manage their restaurant printers" ON public.restaurant_printers
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Admins can manage all restaurant printers" ON public.restaurant_printers
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Restaurant print config policies - these were missing
CREATE POLICY "Restaurant owners can manage their print config" ON public.restaurant_print_config
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Admins can manage all print configs" ON public.restaurant_print_config
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Printer settings policies - these were missing
CREATE POLICY "Restaurant owners can manage their printer settings" ON public.printer_settings
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Admins can manage all printer settings" ON public.printer_settings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Topping categories policies - these were missing
CREATE POLICY "Restaurant owners can manage their topping categories" ON public.topping_categories
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Admins can manage all topping categories" ON public.topping_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Allow public SELECT for topping categories" ON public.topping_categories
  FOR SELECT
  USING (true);

-- Toppings policies - these were missing
CREATE POLICY "Restaurant owners can manage their toppings" ON public.toppings
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

CREATE POLICY "Admins can manage all toppings" ON public.toppings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Allow public SELECT for toppings" ON public.toppings
  FOR SELECT
  USING (true);

-- Menu item options policies - these were missing
CREATE POLICY "Restaurant owners can manage their menu item options" ON public.menu_item_options
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

CREATE POLICY "Admins can manage all menu item options" ON public.menu_item_options
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Allow public SELECT for menu item options" ON public.menu_item_options
  FOR SELECT
  USING (true);

-- Option choices policies - these were missing
CREATE POLICY "Restaurant owners can manage their option choices" ON public.option_choices
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

CREATE POLICY "Admins can manage all option choices" ON public.option_choices
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Allow public SELECT for option choices" ON public.option_choices
  FOR SELECT
  USING (true);

-- Menu item topping categories policies - these were missing
CREATE POLICY "Restaurant owners can manage their menu item topping categories" ON public.menu_item_topping_categories
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

CREATE POLICY "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Allow public SELECT for menu item topping categories" ON public.menu_item_topping_categories
  FOR SELECT
  USING (true);

-- Payments policies - these were missing
CREATE POLICY "Restaurant owners can view their payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
      WHERE o.id = payments.order_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payments" ON public.payments
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Add missing order type and table number columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text,
ADD COLUMN IF NOT EXISTS table_number text;

-- Update orders policies to allow kiosk systems to insert with order type and table number
DROP POLICY IF EXISTS "Kiosk can insert orders only" ON public.orders;
CREATE POLICY "Kiosk can insert orders only" ON public.orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add admin policies for order item toppings and options that were missing
CREATE POLICY "Admins can manage all order item toppings" ON public.order_item_toppings
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

CREATE POLICY "Admins can manage all order item options" ON public.order_item_options
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());
