
-- Clean up duplicate RLS policies and standardize naming
-- This migration removes redundant policies and ensures consistent naming

-- First, let's check and clean up any duplicate policies on key tables
-- Drop any existing policies that might be duplicated or inconsistently named

-- Clean up profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create standardized profiles policies
CREATE POLICY "profiles_users_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_users_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Clean up restaurant_owners table policies
DROP POLICY IF EXISTS "Restaurant owners can view their assignments" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Admins can manage restaurant owners" ON public.restaurant_owners;

-- Create standardized restaurant_owners policies
CREATE POLICY "restaurant_owners_users_select_own" ON public.restaurant_owners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "restaurant_owners_admin_all_access" ON public.restaurant_owners
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Clean up restaurants table policies
DROP POLICY IF EXISTS "Restaurant owners can view their restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Allow public SELECT for restaurants" ON public.restaurants;

-- Create standardized restaurants policies
CREATE POLICY "restaurants_public_select" ON public.restaurants
  FOR SELECT
  USING (true);

CREATE POLICY "restaurants_owners_all_access" ON public.restaurants
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(id))
  WITH CHECK (public.is_restaurant_owner(id));

CREATE POLICY "restaurants_admin_all_access" ON public.restaurants
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Clean up menu_categories table policies
DROP POLICY IF EXISTS "Restaurant owners can manage their menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Admins can manage all menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Allow public SELECT for menu categories" ON public.menu_categories;

-- Create standardized menu_categories policies
CREATE POLICY "menu_categories_public_select" ON public.menu_categories
  FOR SELECT
  USING (true);

CREATE POLICY "menu_categories_owners_all_access" ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "menu_categories_admin_all_access" ON public.menu_categories
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Clean up menu_items table policies
DROP POLICY IF EXISTS "Restaurant owners can manage their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow public SELECT for menu items" ON public.menu_items;

-- Create standardized menu_items policies
CREATE POLICY "menu_items_public_select" ON public.menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "menu_items_owners_all_access" ON public.menu_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_items.category_id AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_items.category_id AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "menu_items_admin_all_access" ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Clean up orders table policies
DROP POLICY IF EXISTS "Restaurant owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Create standardized orders policies
CREATE POLICY "orders_owners_select" ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "orders_admin_all_access" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Clean up order_items table policies
DROP POLICY IF EXISTS "Restaurant owners can view order items from their restaurants" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

-- Create standardized order_items policies
CREATE POLICY "order_items_owners_select" ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_owner_of_order(order_id));

CREATE POLICY "order_items_admin_all_access" ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());
