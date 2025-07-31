-- Fix remaining function search path security issues

-- Set search path for all remaining functions that need it
ALTER FUNCTION public.audit_admin_changes() SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.cleanup_rate_limits() SET search_path = public;
ALTER FUNCTION public.detect_admin_anomalies() SET search_path = public;
ALTER FUNCTION public.log_security_event(text, text, text, text, text, uuid, uuid, jsonb) SET search_path = public;