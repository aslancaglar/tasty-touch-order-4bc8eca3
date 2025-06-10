
-- Enable RLS on all tables that don't have it yet (ignore if already enabled)
DO $$ 
BEGIN
    -- Enable RLS on tables that might not have it
    BEGIN
        ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if already enabled
    END;
    
    BEGIN
        ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.option_choices ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.menu_item_topping_categories ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Create or replace security definer functions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT CASE 
    WHEN is_admin THEN 'admin'
    ELSE 'owner'
  END
  FROM public.profiles 
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_owns_restaurant(restaurant_uuid uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid 
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing policies if they exist and create new ones
DO $$
BEGIN
    -- Profiles table policies
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
    
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);

    CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);

    CREATE POLICY "Admins can view all profiles" ON public.profiles
      FOR ALL USING (public.is_current_user_admin());

    -- Restaurant policies
    DROP POLICY IF EXISTS "Admins can manage all restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can view their restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Owners can update their restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Public can view restaurants for kiosk" ON public.restaurants;
    
    CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can view their restaurants" ON public.restaurants
      FOR SELECT USING (public.user_owns_restaurant(id));

    CREATE POLICY "Owners can update their restaurants" ON public.restaurants
      FOR UPDATE USING (public.user_owns_restaurant(id));

    CREATE POLICY "Public can view restaurants for kiosk" ON public.restaurants
      FOR SELECT USING (true);

    -- Restaurant owners policies
    DROP POLICY IF EXISTS "Admins can manage restaurant owners" ON public.restaurant_owners;
    DROP POLICY IF EXISTS "Owners can view their ownerships" ON public.restaurant_owners;
    
    CREATE POLICY "Admins can manage restaurant owners" ON public.restaurant_owners
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can view their ownerships" ON public.restaurant_owners
      FOR SELECT USING (user_id = auth.uid());

    -- Menu categories policies
    DROP POLICY IF EXISTS "Admins can manage all categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Owners can manage their restaurant categories" ON public.menu_categories;
    DROP POLICY IF EXISTS "Public can view categories for kiosk" ON public.menu_categories;
    
    CREATE POLICY "Admins can manage all categories" ON public.menu_categories
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their restaurant categories" ON public.menu_categories
      FOR ALL USING (public.user_owns_restaurant(restaurant_id));

    CREATE POLICY "Public can view categories for kiosk" ON public.menu_categories
      FOR SELECT USING (true);

    -- Menu items policies
    DROP POLICY IF EXISTS "Admins can manage all menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Owners can manage their restaurant menu items" ON public.menu_items;
    DROP POLICY IF EXISTS "Public can view menu items for kiosk" ON public.menu_items;
    
    CREATE POLICY "Admins can manage all menu items" ON public.menu_items
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their restaurant menu items" ON public.menu_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.menu_categories mc
          WHERE mc.id = menu_items.category_id
          AND public.user_owns_restaurant(mc.restaurant_id)
        )
      );

    CREATE POLICY "Public can view menu items for kiosk" ON public.menu_items
      FOR SELECT USING (true);

    -- Menu item options policies
    DROP POLICY IF EXISTS "Admins can manage all menu item options" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Owners can manage their menu item options" ON public.menu_item_options;
    DROP POLICY IF EXISTS "Public can view menu item options for kiosk" ON public.menu_item_options;
    
    CREATE POLICY "Admins can manage all menu item options" ON public.menu_item_options
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their menu item options" ON public.menu_item_options
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.menu_items mi
          JOIN public.menu_categories mc ON mi.category_id = mc.id
          WHERE mi.id = menu_item_options.menu_item_id
          AND public.user_owns_restaurant(mc.restaurant_id)
        )
      );

    CREATE POLICY "Public can view menu item options for kiosk" ON public.menu_item_options
      FOR SELECT USING (true);

    -- Option choices policies
    DROP POLICY IF EXISTS "Admins can manage all option choices" ON public.option_choices;
    DROP POLICY IF EXISTS "Owners can manage their option choices" ON public.option_choices;
    DROP POLICY IF EXISTS "Public can view option choices for kiosk" ON public.option_choices;
    
    CREATE POLICY "Admins can manage all option choices" ON public.option_choices
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their option choices" ON public.option_choices
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.menu_item_options mio
          JOIN public.menu_items mi ON mio.menu_item_id = mi.id
          JOIN public.menu_categories mc ON mi.category_id = mc.id
          WHERE mio.id = option_choices.option_id
          AND public.user_owns_restaurant(mc.restaurant_id)
        )
      );

    CREATE POLICY "Public can view option choices for kiosk" ON public.option_choices
      FOR SELECT USING (true);

    -- Topping categories policies
    DROP POLICY IF EXISTS "Admins can manage all topping categories" ON public.topping_categories;
    DROP POLICY IF EXISTS "Owners can manage their topping categories" ON public.topping_categories;
    DROP POLICY IF EXISTS "Public can view topping categories for kiosk" ON public.topping_categories;
    
    CREATE POLICY "Admins can manage all topping categories" ON public.topping_categories
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their topping categories" ON public.topping_categories
      FOR ALL USING (public.user_owns_restaurant(restaurant_id));

    CREATE POLICY "Public can view topping categories for kiosk" ON public.topping_categories
      FOR SELECT USING (true);

    -- Toppings policies
    DROP POLICY IF EXISTS "Admins can manage all toppings" ON public.toppings;
    DROP POLICY IF EXISTS "Owners can manage their toppings" ON public.toppings;
    DROP POLICY IF EXISTS "Public can view toppings for kiosk" ON public.toppings;
    
    CREATE POLICY "Admins can manage all toppings" ON public.toppings
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their toppings" ON public.toppings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.topping_categories tc
          WHERE tc.id = toppings.category_id
          AND public.user_owns_restaurant(tc.restaurant_id)
        )
      );

    CREATE POLICY "Public can view toppings for kiosk" ON public.toppings
      FOR SELECT USING (true);

    -- Menu item topping categories policies
    DROP POLICY IF EXISTS "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Owners can manage their menu item topping categories" ON public.menu_item_topping_categories;
    DROP POLICY IF EXISTS "Public can view menu item topping categories for kiosk" ON public.menu_item_topping_categories;
    
    CREATE POLICY "Admins can manage all menu item topping categories" ON public.menu_item_topping_categories
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their menu item topping categories" ON public.menu_item_topping_categories
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.menu_items mi
          JOIN public.menu_categories mc ON mi.category_id = mc.id
          WHERE mi.id = menu_item_topping_categories.menu_item_id
          AND public.user_owns_restaurant(mc.restaurant_id)
        )
      );

    CREATE POLICY "Public can view menu item topping categories for kiosk" ON public.menu_item_topping_categories
      FOR SELECT USING (true);

    -- Orders policies
    DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
    DROP POLICY IF EXISTS "Owners can manage their restaurant orders" ON public.orders;
    DROP POLICY IF EXISTS "Public can create orders for kiosk" ON public.orders;
    
    CREATE POLICY "Admins can manage all orders" ON public.orders
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their restaurant orders" ON public.orders
      FOR ALL USING (public.user_owns_restaurant(restaurant_id));

    CREATE POLICY "Public can create orders for kiosk" ON public.orders
      FOR INSERT WITH CHECK (true);

    -- Order items policies
    DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
    DROP POLICY IF EXISTS "Owners can manage their restaurant order items" ON public.order_items;
    DROP POLICY IF EXISTS "Public can create order items for kiosk" ON public.order_items;
    
    CREATE POLICY "Admins can manage all order items" ON public.order_items
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their restaurant order items" ON public.order_items
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_items.order_id
          AND public.user_owns_restaurant(o.restaurant_id)
        )
      );

    CREATE POLICY "Public can create order items for kiosk" ON public.order_items
      FOR INSERT WITH CHECK (true);

    -- Order item options policies
    DROP POLICY IF EXISTS "Admins can manage all order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Owners can manage their order item options" ON public.order_item_options;
    DROP POLICY IF EXISTS "Public can create order item options for kiosk" ON public.order_item_options;
    
    CREATE POLICY "Admins can manage all order item options" ON public.order_item_options
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their order item options" ON public.order_item_options
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.order_items oi
          JOIN public.orders o ON oi.order_id = o.id
          WHERE oi.id = order_item_options.order_item_id
          AND public.user_owns_restaurant(o.restaurant_id)
        )
      );

    CREATE POLICY "Public can create order item options for kiosk" ON public.order_item_options
      FOR INSERT WITH CHECK (true);

    -- Order item toppings policies
    DROP POLICY IF EXISTS "Admins can manage all order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Owners can manage their order item toppings" ON public.order_item_toppings;
    DROP POLICY IF EXISTS "Public can create order item toppings for kiosk" ON public.order_item_toppings;
    
    CREATE POLICY "Admins can manage all order item toppings" ON public.order_item_toppings
      FOR ALL USING (public.is_current_user_admin());

    CREATE POLICY "Owners can manage their order item toppings" ON public.order_item_toppings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.order_items oi
          JOIN public.orders o ON oi.order_id = o.id
          WHERE oi.id = order_item_toppings.order_item_id
          AND public.user_owns_restaurant(o.restaurant_id)
        )
      );

    CREATE POLICY "Public can create order item toppings for kiosk" ON public.order_item_toppings
      FOR INSERT WITH CHECK (true);

END $$;
