
-- First, drop all existing policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "System can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Drop any other potential existing policies on remaining tables
DROP POLICY IF EXISTS "Public can view restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can create restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Owners and admins can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;

DROP POLICY IF EXISTS "Public can view menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can create menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can update menu categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners and admins can delete menu categories" ON public.menu_categories;

DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can create menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can update menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners and admins can delete menu items" ON public.menu_items;

DROP POLICY IF EXISTS "Owners can view their restaurant orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Owners and admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

DROP POLICY IF EXISTS "Owners can view their restaurant order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Owners and admins can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

DROP POLICY IF EXISTS "Owners can view their restaurant payments" ON public.payments;
DROP POLICY IF EXISTS "System can create payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

DROP POLICY IF EXISTS "Users can view their ownership records" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Admins can create ownership records" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Admins can update ownership records" ON public.restaurant_owners;
DROP POLICY IF EXISTS "Admins can delete ownership records" ON public.restaurant_owners;

-- Now create all the security definer functions (in case they don't exist)
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

-- Enable RLS on all tables
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RESTAURANTS TABLE POLICIES
CREATE POLICY "Public can view restaurants" 
ON public.restaurants 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can create restaurants" 
ON public.restaurants 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin_secure());

CREATE POLICY "Owners and admins can update restaurants" 
ON public.restaurants 
FOR UPDATE 
TO authenticated
USING (public.is_restaurant_owner_secure(id) OR public.is_admin_secure())
WITH CHECK (public.is_restaurant_owner_secure(id) OR public.is_admin_secure());

CREATE POLICY "Admins can delete restaurants" 
ON public.restaurants 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

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

-- PAYMENTS POLICIES
CREATE POLICY "Owners can view their restaurant payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  public.is_restaurant_owner_secure(public.get_restaurant_from_order(order_id)) 
  OR public.is_admin_secure()
);

CREATE POLICY "System can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (public.is_admin_secure())
WITH CHECK (public.is_admin_secure());

CREATE POLICY "Admins can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- RESTAURANT OWNERS POLICIES
CREATE POLICY "Users can view their ownership records" 
ON public.restaurant_owners 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_secure());

CREATE POLICY "Admins can create ownership records" 
ON public.restaurant_owners 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin_secure());

CREATE POLICY "Admins can update ownership records" 
ON public.restaurant_owners 
FOR UPDATE 
TO authenticated
USING (public.is_admin_secure())
WITH CHECK (public.is_admin_secure());

CREATE POLICY "Admins can delete ownership records" 
ON public.restaurant_owners 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid() OR public.is_admin_secure());

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid() OR public.is_admin_secure())
WITH CHECK (id = auth.uid() OR public.is_admin_secure());

CREATE POLICY "System can create profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin_secure());
