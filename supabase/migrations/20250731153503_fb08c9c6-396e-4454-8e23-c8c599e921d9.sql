-- Critical Database Security Fixes

-- 1. Add audit triggers for admin privilege changes
CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log any changes to admin status
  IF TG_OP = 'UPDATE' AND OLD.is_admin != NEW.is_admin THEN
    INSERT INTO public.audit_logs (
      table_name,
      action,
      record_id,
      old_values,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      'admin_privilege_change',
      NEW.id,
      jsonb_build_object('is_admin', OLD.is_admin),
      jsonb_build_object('is_admin', NEW.is_admin),
      auth.uid(),
      current_setting('request.ip_address', true),
      current_setting('request.user_agent', true)
    );
    
    -- Log security event for admin changes
    PERFORM log_security_event(
      'admin_privilege_change',
      CASE WHEN NEW.is_admin THEN 'critical' ELSE 'high' END,
      CASE WHEN NEW.is_admin THEN 'Admin privileges granted' ELSE 'Admin privileges revoked' END,
      'User ' || NEW.email || ' admin status changed from ' || OLD.is_admin || ' to ' || NEW.is_admin,
      current_setting('request.ip_address', true),
      auth.uid(),
      NULL,
      jsonb_build_object('old_admin_status', OLD.is_admin, 'new_admin_status', NEW.is_admin, 'target_user', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profiles table
CREATE TRIGGER profiles_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_admin_changes();

-- 2. Enhance RLS policies with additional security checks
CREATE POLICY "Prevent admin self-modification" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    -- Users cannot modify their own admin status
    NOT (
      id = auth.uid() AND 
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
      )
    ) OR
    -- Allow if not changing admin status
    (
      SELECT is_admin FROM public.profiles WHERE id = profiles.id
    ) = (
      SELECT is_admin FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 3. Add rate limiting for security events
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own rate limits" ON public.rate_limits
  FOR ALL TO authenticated
  USING (identifier = auth.uid()::text)
  WITH CHECK (identifier = auth.uid()::text);

-- 4. Create function for database-level rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _action text,
  _max_requests integer DEFAULT 10,
  _window_minutes integer DEFAULT 1
) RETURNS boolean AS $$
DECLARE
  _current_count integer;
  _window_start timestamp with time zone;
BEGIN
  _window_start := date_trunc('minute', now()) - (extract(minute from now())::integer % _window_minutes || ' minutes')::interval;
  
  -- Get current count for this window
  SELECT count INTO _current_count
  FROM public.rate_limits
  WHERE identifier = _identifier 
    AND action = _action 
    AND window_start = _window_start;
  
  IF _current_count IS NULL THEN
    -- First request in this window
    INSERT INTO public.rate_limits (identifier, action, count, window_start)
    VALUES (_identifier, _action, 1, _window_start)
    ON CONFLICT (identifier, action, window_start) 
    DO UPDATE SET count = rate_limits.count + 1;
    RETURN true;
  ELSIF _current_count < _max_requests THEN
    -- Increment counter
    UPDATE public.rate_limits 
    SET count = count + 1
    WHERE identifier = _identifier 
      AND action = _action 
      AND window_start = _window_start;
    RETURN true;
  ELSE
    -- Rate limit exceeded
    PERFORM log_security_event(
      'rate_limit_exceeded',
      'medium',
      'Rate limit exceeded',
      'Action: ' || _action || ', Max: ' || _max_requests || ', Window: ' || _window_minutes || 'min',
      current_setting('request.ip_address', true),
      CASE WHEN _identifier ~ '^[0-9a-f-]{36}$' THEN _identifier::uuid ELSE NULL END,
      NULL,
      jsonb_build_object('action', _action, 'max_requests', _max_requests, 'window_minutes', _window_minutes)
    );
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cleanup old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enhanced security for function execution
ALTER FUNCTION public.get_current_user_admin_status() SET search_path = public;
ALTER FUNCTION public.get_user_restaurant_ids() SET search_path = public;
ALTER FUNCTION public.is_restaurant_owner(uuid) SET search_path = public;
ALTER FUNCTION public.is_restaurant_owner_of_order(uuid) SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 7. Add anomaly detection for suspicious admin activities
CREATE OR REPLACE FUNCTION public.detect_admin_anomalies()
RETURNS void AS $$
DECLARE
  _admin_count integer;
  _recent_admin_changes integer;
BEGIN
  -- Check for too many admins
  SELECT COUNT(*) INTO _admin_count 
  FROM public.profiles 
  WHERE is_admin = true;
  
  IF _admin_count > 5 THEN
    PERFORM log_security_event(
      'admin_count_anomaly',
      'high',
      'Unusual number of admin accounts',
      'Total admin accounts: ' || _admin_count,
      NULL,
      NULL,
      NULL,
      jsonb_build_object('admin_count', _admin_count, 'threshold', 5)
    );
  END IF;
  
  -- Check for rapid admin privilege changes
  SELECT COUNT(*) INTO _recent_admin_changes
  FROM public.audit_logs
  WHERE action = 'admin_privilege_change'
    AND created_at > now() - interval '1 hour';
    
  IF _recent_admin_changes > 3 THEN
    PERFORM log_security_event(
      'rapid_admin_changes',
      'critical',
      'Rapid admin privilege changes detected',
      'Admin changes in last hour: ' || _recent_admin_changes,
      NULL,
      NULL,
      NULL,
      jsonb_build_object('changes_count', _recent_admin_changes, 'threshold', 3, 'window', '1 hour')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;