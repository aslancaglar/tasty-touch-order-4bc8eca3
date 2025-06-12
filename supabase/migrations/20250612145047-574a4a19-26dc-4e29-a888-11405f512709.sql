
-- Add back the plain text api_key column to restaurant_print_config
ALTER TABLE public.restaurant_print_config 
ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_print_config_api_key 
ON public.restaurant_print_config (restaurant_id) 
WHERE api_key IS NOT NULL;
