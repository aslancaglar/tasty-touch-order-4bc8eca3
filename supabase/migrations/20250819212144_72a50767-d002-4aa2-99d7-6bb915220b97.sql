-- Fix security vulnerability: Remove public access to security_events table
-- Ensure RLS is enabled and only authenticated users with proper permissions can access security events

-- First, ensure RLS is enabled on security_events table
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might allow public access
DROP POLICY IF EXISTS "Allow public read access to security events" ON public.security_events;
DROP POLICY IF EXISTS "Public can view security events" ON public.security_events;
DROP POLICY IF EXISTS "Allow anonymous users to read security events" ON public.security_events;

-- Ensure only the secure policies exist:
-- 1. Admins can manage all security events (already exists)
-- 2. Restaurant owners can view only their own security events (already exists)

-- Add explicit policy to deny all public access (redundant but explicit)
CREATE POLICY "Deny public access to security events" 
ON public.security_events 
FOR ALL 
TO anon 
USING (false) 
WITH CHECK (false);

-- Ensure authenticated users without proper roles cannot access security events
CREATE POLICY "Authenticated users without roles cannot access security events" 
ON public.security_events 
FOR ALL 
TO authenticated 
USING (
  get_current_user_admin_status() OR 
  (restaurant_id IS NOT NULL AND is_restaurant_owner(restaurant_id))
) 
WITH CHECK (
  get_current_user_admin_status() OR 
  (restaurant_id IS NOT NULL AND is_restaurant_owner(restaurant_id))
);

-- Revoke any direct table permissions that might bypass RLS
REVOKE ALL ON public.security_events FROM anon;
REVOKE ALL ON public.security_events FROM authenticated;

-- Grant only necessary permissions to authenticated users (RLS will still apply)
GRANT SELECT ON public.security_events TO authenticated;
GRANT INSERT, UPDATE ON public.security_events TO authenticated;