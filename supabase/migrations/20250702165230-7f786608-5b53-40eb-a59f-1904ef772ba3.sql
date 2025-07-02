-- Fix RLS recursion issue by updating profiles policies to use security definer function
-- Enable RLS on profiles table if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies if they exist
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- The profiles table should use the existing get_current_user_admin_status function
-- Update the admin policy to use the security definer function
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  TO authenticated
  USING (get_current_user_admin_status())
  WITH CHECK (get_current_user_admin_status());

-- Add comprehensive security headers function for edge functions
CREATE OR REPLACE FUNCTION public.get_security_headers()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT jsonb_build_object(
    'X-Content-Type-Options', 'nosniff',
    'X-Frame-Options', 'DENY',
    'X-XSS-Protection', '1; mode=block',
    'Referrer-Policy', 'strict-origin-when-cross-origin',
    'Permissions-Policy', 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline'' https://cdn.jsdelivr.net; style-src ''self'' ''unsafe-inline'' https://fonts.googleapis.com; img-src ''self'' data: https: blob:; font-src ''self'' https://fonts.gstatic.com; connect-src ''self'' https://*.supabase.co'
  );
$$;