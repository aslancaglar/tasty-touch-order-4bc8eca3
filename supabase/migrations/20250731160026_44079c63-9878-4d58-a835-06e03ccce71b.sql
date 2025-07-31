-- Remove api_key column from restaurant_print_config table for security
-- The API key will now be stored securely in Supabase secrets
ALTER TABLE public.restaurant_print_config 
DROP COLUMN IF EXISTS api_key;