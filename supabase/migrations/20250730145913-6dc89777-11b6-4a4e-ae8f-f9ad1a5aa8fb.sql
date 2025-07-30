-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create language_settings table
CREATE TABLE public.language_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('fr', 'en', 'tr')),
  flag_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, language)
);

-- Enable RLS
ALTER TABLE public.language_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view language settings" 
ON public.language_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage all language settings" 
ON public.language_settings 
FOR ALL 
USING (get_current_user_admin_status())
WITH CHECK (get_current_user_admin_status());

CREATE POLICY "Restaurant owners can manage their language settings" 
ON public.language_settings 
FOR ALL 
USING (is_restaurant_owner(restaurant_id))
WITH CHECK (is_restaurant_owner(restaurant_id));

-- Create storage bucket for language flags
INSERT INTO storage.buckets (id, name, public) 
VALUES ('language-flags', 'Language Flags', true);

-- Create storage policies for language flags
CREATE POLICY "Language flags are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'language-flags');

CREATE POLICY "Authenticated users can upload language flags" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'language-flags' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update language flags" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'language-flags' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete language flags" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'language-flags' AND auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_language_settings_updated_at
BEFORE UPDATE ON public.language_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();