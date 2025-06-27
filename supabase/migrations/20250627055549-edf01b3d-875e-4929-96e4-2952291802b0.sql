
-- ========================================
-- CRITICAL SECURITY FIXES - PHASE 1: RLS POLICIES
-- ========================================

-- Fix missing RLS policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles RLS policies
CREATE POLICY "profiles_users_own_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_users_own_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all_access" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Fix missing RLS policies for restaurant_owners table
ALTER TABLE public.restaurant_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurant_owners_own_select" ON public.restaurant_owners
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "restaurant_owners_admin_all_access" ON public.restaurant_owners
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Fix missing RLS policies for orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_owners_select" ON public.orders
  FOR SELECT
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "orders_owners_update" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "orders_admin_all_access" ON public.orders
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Fix missing RLS policies for order_items table
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_owners_select" ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
      AND public.is_restaurant_owner(o.restaurant_id)
    )
  );

CREATE POLICY "order_items_admin_all_access" ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Update existing policies to use standardized naming and remove redundancies
-- Drop old policies first to avoid conflicts
DROP POLICY IF EXISTS "restaurant_print_config_owners_all_access" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "restaurant_print_config_admin_all_access" ON public.restaurant_print_config;
DROP POLICY IF EXISTS "restaurant_printers_owners_all_access" ON public.restaurant_printers;
DROP POLICY IF EXISTS "restaurant_printers_admin_all_access" ON public.restaurant_printers;
DROP POLICY IF EXISTS "restaurant_tables_owners_all_access" ON public.restaurant_tables;
DROP POLICY IF EXISTS "restaurant_tables_admin_all_access" ON public.restaurant_tables;
DROP POLICY IF EXISTS "printer_settings_owners_all_access" ON public.printer_settings;
DROP POLICY IF EXISTS "printer_settings_admin_all_access" ON public.printer_settings;

-- Recreate with standardized secure policies
CREATE POLICY "restaurant_print_config_secure_access" ON public.restaurant_print_config
  FOR ALL
  TO authenticated
  USING (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  )
  WITH CHECK (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "restaurant_printers_secure_access" ON public.restaurant_printers
  FOR ALL
  TO authenticated
  USING (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  )
  WITH CHECK (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "restaurant_tables_secure_access" ON public.restaurant_tables
  FOR ALL
  TO authenticated
  USING (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  )
  WITH CHECK (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  );

CREATE POLICY "printer_settings_secure_access" ON public.printer_settings
  FOR ALL
  TO authenticated
  USING (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  )
  WITH CHECK (
    public.get_current_user_admin_status() OR 
    public.is_restaurant_owner(restaurant_id)
  );

-- ========================================
-- CRITICAL SECURITY FIXES - PHASE 2: FUNCTION HARDENING
-- ========================================

-- Add missing input validation and security hardening to existing functions
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid 
    AND user_id = auth.uid()
    AND restaurant_uuid IS NOT NULL
    AND auth.uid() IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() AND auth.uid() IS NOT NULL), 
    false
  );
$$;

-- Add security logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  event_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Basic validation
  IF event_type IS NULL OR length(event_type) = 0 THEN
    RETURN;
  END IF;
  
  -- Log to PostgreSQL logs (admins can monitor)
  RAISE LOG 'SECURITY_EVENT: % - User: % - Data: %', 
    event_type, 
    COALESCE(auth.uid()::text, 'anonymous'),
    event_data::text;
    
EXCEPTION WHEN OTHERS THEN
  -- Don't let logging errors break the application
  RAISE LOG 'Security logging failed: %', SQLERRM;
END;
$$;

-- ========================================
-- CRITICAL SECURITY FIXES - PHASE 3: ENHANCED VALIDATION
-- ========================================

-- Add input validation function for common patterns
CREATE OR REPLACE FUNCTION public.validate_input(
  input_text text,
  max_length integer DEFAULT 1000,
  allow_html boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE STRICT
AS $$
BEGIN
  -- Null or empty check
  IF input_text IS NULL OR length(trim(input_text)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Length check
  IF length(input_text) > max_length THEN
    RETURN false;
  END IF;
  
  -- Basic XSS prevention if HTML not allowed
  IF NOT allow_html AND (
    input_text ~* '<script|javascript:|vbscript:|onload=|onerror=' OR
    input_text ~* 'union\s+select|drop\s+table|insert\s+into|delete\s+from'
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log the change
  PERFORM public.log_security_event(
    'table_modification',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_id', auth.uid(),
      'timestamp', now()
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_restaurant_owners ON public.restaurant_owners;
CREATE TRIGGER audit_restaurant_owners
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurant_owners
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ========================================
-- CRITICAL SECURITY FIXES - PHASE 4: RATE LIMITING SETUP
-- ========================================

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, action_type)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system access to rate limiting table
CREATE POLICY "rate_limits_admin_only" ON public.rate_limits
  FOR ALL
  TO authenticated
  USING (public.get_current_user_admin_status())
  WITH CHECK (public.get_current_user_admin_status());

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_attempts integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Get current attempts within the window
  SELECT attempts, window_start 
  INTO current_attempts, window_start_time
  FROM public.rate_limits 
  WHERE user_id = p_user_id 
  AND action_type = p_action_type;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (user_id, action_type, attempts, window_start)
    VALUES (p_user_id, p_action_type, 1, now());
    RETURN true;
  END IF;
  
  -- Check if window has expired
  IF window_start_time + (p_window_minutes || ' minutes')::interval < now() THEN
    -- Reset the window
    UPDATE public.rate_limits 
    SET attempts = 1, window_start = now()
    WHERE user_id = p_user_id AND action_type = p_action_type;
    RETURN true;
  END IF;
  
  -- Check if within limits
  IF current_attempts >= p_max_attempts THEN
    -- Log the rate limit violation
    PERFORM public.log_security_event(
      'rate_limit_exceeded',
      jsonb_build_object(
        'user_id', p_user_id,
        'action_type', p_action_type,
        'attempts', current_attempts,
        'max_attempts', p_max_attempts
      )
    );
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE public.rate_limits 
  SET attempts = attempts + 1
  WHERE user_id = p_user_id AND action_type = p_action_type;
  
  RETURN true;
END;
$$;
