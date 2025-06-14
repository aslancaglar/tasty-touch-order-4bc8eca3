
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

-- Now drop all existing policies to start fresh
DROP POLICY IF EXISTS "Restaurant owners can update their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public SELECT for restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurant owners can manage their menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public SELECT for menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Restaurant owners can manage their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public SELECT for menu items" ON public.menu_items;

-- Create all the policies fresh
-- Restaurants table policies
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

-- Menu categories table policies
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

-- Menu items table policies
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
