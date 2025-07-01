-- Security Enhancement: Database Validation Functions and Enhanced RLS Policies

-- 1. Create validation functions for business logic security
CREATE OR REPLACE FUNCTION public.validate_restaurant_exists(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE id = restaurant_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_menu_item_belongs_to_restaurant(item_id uuid, restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.menu_categories mc ON mi.category_id = mc.id
    WHERE mi.id = item_id AND mc.restaurant_id = restaurant_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_topping_belongs_to_restaurant(topping_id uuid, restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.toppings t
    JOIN public.topping_categories tc ON t.category_id = tc.id
    WHERE t.id = topping_id AND tc.restaurant_id = restaurant_uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_order_total(order_uuid uuid, expected_total numeric)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH order_calculation AS (
    SELECT 
      o.id,
      COALESCE(SUM(
        (oi.price * oi.quantity) + 
        COALESCE(topping_totals.topping_total, 0)
      ), 0) as calculated_total
    FROM public.orders o
    LEFT JOIN public.order_items oi ON o.id = oi.order_id
    LEFT JOIN (
      SELECT 
        oit.order_item_id,
        SUM(t.price) as topping_total
      FROM public.order_item_toppings oit
      JOIN public.toppings t ON oit.topping_id = t.id
      GROUP BY oit.order_item_id
    ) topping_totals ON oi.id = topping_totals.order_item_id
    WHERE o.id = order_uuid
    GROUP BY o.id
  )
  SELECT ABS(calculated_total - expected_total) < 0.01
  FROM order_calculation;
$$;

-- 2. Enhanced RLS Policies with additional security checks

-- Enhanced order creation policy with validation
DROP POLICY IF EXISTS "Allow anonymous users to create orders" ON public.orders;
CREATE POLICY "Secure kiosk order creation" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  -- Validate restaurant exists
  public.validate_restaurant_exists(restaurant_id) AND
  -- Ensure reasonable total (between 0.01 and 10000)
  total >= 0.01 AND total <= 10000 AND
  -- Ensure status is appropriate for new orders
  status IN ('pending', 'confirmed')
);

-- Enhanced order items policy with validation
DROP POLICY IF EXISTS "Allow anonymous users to create order items" ON public.order_items;
CREATE POLICY "Secure kiosk order item creation" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  -- Validate reasonable quantity and price
  quantity > 0 AND quantity <= 50 AND
  price >= 0 AND price <= 1000 AND
  -- Validate menu item belongs to order's restaurant
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.menu_items mi ON true
    JOIN public.menu_categories mc ON mi.category_id = mc.id
    WHERE o.id = order_id 
    AND mi.id = menu_item_id 
    AND mc.restaurant_id = o.restaurant_id
  )
);

-- Enhanced order item toppings policy with validation
DROP POLICY IF EXISTS "Allow anonymous users to create order item toppings" ON public.order_item_toppings;
CREATE POLICY "Secure kiosk topping creation" 
ON public.order_item_toppings 
FOR INSERT 
WITH CHECK (
  -- Validate topping belongs to order's restaurant
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.id = order_item_id 
    AND public.validate_topping_belongs_to_restaurant(topping_id, o.restaurant_id)
  )
);

-- 3. Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text,
  resource_type text,
  resource_id uuid,
  details jsonb,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (get_current_user_admin_status());

-- System can insert audit logs (security definer function will handle this)
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_severity text DEFAULT 'low'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, user_id, ip_address, user_agent, 
    resource_type, resource_id, details, severity
  ) VALUES (
    p_event_type, p_user_id, p_ip_address, p_user_agent,
    p_resource_type, p_resource_id, p_details, p_severity
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 5. Rate limiting table for order creation
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  resource_type text NOT NULL, -- 'order_creation', 'login_attempts', etc.
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, resource_type)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system functions can manage rate limits
CREATE POLICY "System manages rate limits" 
ON public.rate_limits 
FOR ALL 
USING (false)
WITH CHECK (false);

-- 6. Create rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_resource_type text,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current rate limit record
  SELECT attempt_count, window_start 
  INTO current_count, window_start_time
  FROM public.rate_limits 
  WHERE identifier = p_identifier AND resource_type = p_resource_type;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (identifier, resource_type, attempt_count, window_start)
    VALUES (p_identifier, p_resource_type, 1, now());
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF window_start_time + (p_window_minutes || ' minutes')::interval < now() THEN
    -- Reset the window
    UPDATE public.rate_limits 
    SET attempt_count = 1, window_start = now(), updated_at = now()
    WHERE identifier = p_identifier AND resource_type = p_resource_type;
    RETURN true;
  END IF;
  
  -- Check if under limit
  IF current_count < p_max_attempts THEN
    UPDATE public.rate_limits 
    SET attempt_count = attempt_count + 1, updated_at = now()
    WHERE identifier = p_identifier AND resource_type = p_resource_type;
    RETURN true;
  END IF;
  
  -- Rate limit exceeded
  PERFORM public.log_security_event(
    'rate_limit_exceeded',
    NULL,
    p_identifier::inet,
    NULL,
    p_resource_type,
    NULL,
    jsonb_build_object('max_attempts', p_max_attempts, 'window_minutes', p_window_minutes),
    'medium'
  );
  
  RETURN false;
END;
$$;

-- 7. Enhanced admin status function with audit logging
CREATE OR REPLACE FUNCTION public.get_current_user_admin_status_audited()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_admin boolean;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Get admin status
  SELECT COALESCE(is_admin, false) INTO is_admin
  FROM public.profiles 
  WHERE id = current_user_id;
  
  -- Log admin access attempts
  IF is_admin THEN
    PERFORM public.log_security_event(
      'admin_access_granted',
      current_user_id,
      NULL,
      NULL,
      'admin_panel',
      NULL,
      NULL,
      'low'
    );
  END IF;
  
  RETURN COALESCE(is_admin, false);
END;
$$;