
-- Remove overly permissive RLS policies and create proper ones
-- First, drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.restaurants;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.restaurants;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.restaurants;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.restaurants;

-- Create security definer functions to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN is_admin THEN 'admin'
    ELSE 'owner'
  END
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(is_admin, false)
  FROM public.profiles 
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_owns_restaurant(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid 
    AND user_id = auth.uid()
  );
$$;

-- Enable RLS on all tables that should have it
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_print_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Restaurant policies
CREATE POLICY "Admins can view all restaurants" ON public.restaurants
FOR SELECT USING (public.is_current_user_admin());

CREATE POLICY "Owners can view their restaurants" ON public.restaurants
FOR SELECT USING (public.user_owns_restaurant(id));

CREATE POLICY "Public can view restaurants for kiosk" ON public.restaurants
FOR SELECT USING (true);

CREATE POLICY "Admins can create restaurants" ON public.restaurants
FOR INSERT WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update all restaurants" ON public.restaurants
FOR UPDATE USING (public.is_current_user_admin());

CREATE POLICY "Owners can update their restaurants" ON public.restaurants
FOR UPDATE USING (public.user_owns_restaurant(id));

CREATE POLICY "Admins can delete restaurants" ON public.restaurants
FOR DELETE USING (public.is_current_user_admin());

-- Menu categories policies
CREATE POLICY "Public can view menu categories" ON public.menu_categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all menu categories" ON public.menu_categories
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Owners can manage their menu categories" ON public.menu_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_id 
    AND public.user_owns_restaurant(r.id)
  )
);

-- Menu items policies
CREATE POLICY "Public can view menu items" ON public.menu_items
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all menu items" ON public.menu_items
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Owners can manage their menu items" ON public.menu_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.menu_categories mc
    JOIN public.restaurants r ON mc.restaurant_id = r.id
    WHERE mc.id = category_id 
    AND public.user_owns_restaurant(r.id)
  )
);

-- Topping categories policies
CREATE POLICY "Public can view topping categories" ON public.topping_categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all topping categories" ON public.topping_categories
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Owners can manage their topping categories" ON public.topping_categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = restaurant_id 
    AND public.user_owns_restaurant(r.id)
  )
);

-- Toppings policies
CREATE POLICY "Public can view toppings" ON public.toppings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage all toppings" ON public.toppings
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Owners can manage their toppings" ON public.toppings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.topping_categories tc
    JOIN public.restaurants r ON tc.restaurant_id = r.id
    WHERE tc.id = category_id 
    AND public.user_owns_restaurant(r.id)
  )
);

-- Orders policies
CREATE POLICY "Admins can view all orders" ON public.orders
FOR SELECT USING (public.is_current_user_admin());

CREATE POLICY "Owners can view their restaurant orders" ON public.orders
FOR SELECT USING (public.user_owns_restaurant(restaurant_id));

CREATE POLICY "Public can create orders" ON public.orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update all orders" ON public.orders
FOR UPDATE USING (public.is_current_user_admin());

CREATE POLICY "Owners can update their restaurant orders" ON public.orders
FOR UPDATE USING (public.user_owns_restaurant(restaurant_id));

-- Order items policies
CREATE POLICY "Admins can view all order items" ON public.order_items
FOR SELECT USING (public.is_current_user_admin());

CREATE POLICY "Owners can view their restaurant order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id 
    AND public.user_owns_restaurant(o.restaurant_id)
  )
);

CREATE POLICY "Public can create order items" ON public.order_items
FOR INSERT WITH CHECK (true);

-- Restaurant owners policies
CREATE POLICY "Admins can manage restaurant owners" ON public.restaurant_owners
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Users can view their own restaurant ownerships" ON public.restaurant_owners
FOR SELECT USING (user_id = auth.uid());

-- Restaurant print config policies
CREATE POLICY "Admins can manage all print configs" ON public.restaurant_print_config
FOR ALL USING (public.is_current_user_admin());

CREATE POLICY "Owners can manage their restaurant print config" ON public.restaurant_print_config
FOR ALL USING (public.user_owns_restaurant(restaurant_id));

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_current_user_admin());

-- Create audit logging table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_log
FOR SELECT USING (public.is_current_user_admin());

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      user_id, action, table_name, record_id, old_data, created_at
    ) VALUES (
      auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), now()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      user_id, action, table_name, record_id, old_data, new_data, created_at
    ) VALUES (
      auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      user_id, action, table_name, record_id, new_data, created_at
    ) VALUES (
      auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), now()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit triggers on sensitive tables
CREATE TRIGGER audit_restaurants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_menu_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_profiles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Create session validation function
CREATE OR REPLACE FUNCTION public.validate_session_security()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_age interval;
  max_session_age interval := '24 hours';
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Additional session validation could be added here
  -- For now, we rely on Supabase's built-in session management
  
  RETURN true;
END;
$$;
