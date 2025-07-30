-- Create languages table to store all available languages
CREATE TABLE public.languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  flag_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on languages table
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

-- Create policies for languages table
CREATE POLICY "Public can view languages" 
ON public.languages 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage all languages" 
ON public.languages 
FOR ALL 
USING (get_current_user_admin_status())
WITH CHECK (get_current_user_admin_status());

-- Create restaurant_languages junction table
CREATE TABLE public.restaurant_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  language_code TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, language_code)
);

-- Enable RLS on restaurant_languages table
ALTER TABLE public.restaurant_languages ENABLE ROW LEVEL SECURITY;

-- Create policies for restaurant_languages table
CREATE POLICY "Public can view restaurant languages" 
ON public.restaurant_languages 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage all restaurant languages" 
ON public.restaurant_languages 
FOR ALL 
USING (get_current_user_admin_status())
WITH CHECK (get_current_user_admin_status());

CREATE POLICY "Restaurant owners can manage their restaurant languages" 
ON public.restaurant_languages 
FOR ALL 
USING (is_restaurant_owner(restaurant_id))
WITH CHECK (is_restaurant_owner(restaurant_id));

-- Add foreign key constraints
ALTER TABLE public.restaurant_languages 
ADD CONSTRAINT fk_restaurant_languages_restaurant 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

ALTER TABLE public.restaurant_languages 
ADD CONSTRAINT fk_restaurant_languages_language 
FOREIGN KEY (language_code) REFERENCES public.languages(code) ON DELETE CASCADE;

-- Insert default languages
INSERT INTO public.languages (code, name, flag_url) VALUES
('fr', 'Français', NULL),
('en', 'English', NULL),
('tr', 'Türkçe', NULL);

-- Migrate existing language_settings data to new structure
INSERT INTO public.restaurant_languages (restaurant_id, language_code, is_default)
SELECT DISTINCT 
  restaurant_id, 
  language,
  true -- Set as default for migration
FROM public.language_settings
ON CONFLICT (restaurant_id, language_code) DO NOTHING;

-- Update languages table with flag URLs from existing language_settings
UPDATE public.languages 
SET flag_url = ls.flag_url
FROM public.language_settings ls
WHERE ls.language = languages.code
AND ls.flag_url IS NOT NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER update_languages_updated_at
BEFORE UPDATE ON public.languages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_languages_updated_at
BEFORE UPDATE ON public.restaurant_languages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();