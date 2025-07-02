-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add supported_languages array column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN supported_languages text[] DEFAULT ARRAY['fr']::text[];

-- Create menu category translations table
CREATE TABLE public.menu_category_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, language_code)
);

-- Create menu item translations table
CREATE TABLE public.menu_item_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, language_code)
);

-- Create topping category translations table
CREATE TABLE public.topping_category_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topping_category_id UUID NOT NULL REFERENCES public.topping_categories(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topping_category_id, language_code)
);

-- Create topping translations table
CREATE TABLE public.topping_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topping_id UUID NOT NULL REFERENCES public.toppings(id) ON DELETE CASCADE,
  language_code VARCHAR(5) NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topping_id, language_code)
);

-- Enable RLS on all translation tables
ALTER TABLE public.menu_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topping_translations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for menu category translations
CREATE POLICY "Allow public read access to menu category translations"
  ON public.menu_category_translations FOR SELECT
  USING (true);

CREATE POLICY "Allow restaurant owners to manage their menu category translations"
  ON public.menu_category_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_category_translations.category_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_categories mc
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mc.id = menu_category_translations.category_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to manage all menu category translations"
  ON public.menu_category_translations FOR ALL
  USING (get_current_user_admin_status())
  WITH CHECK (get_current_user_admin_status());

-- Create RLS policies for menu item translations
CREATE POLICY "Allow public read access to menu item translations"
  ON public.menu_item_translations FOR SELECT
  USING (true);

CREATE POLICY "Allow restaurant owners to manage their menu item translations"
  ON public.menu_item_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_translations.menu_item_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.menu_categories mc ON mi.category_id = mc.id
      JOIN public.restaurant_owners ro ON mc.restaurant_id = ro.restaurant_id
      WHERE mi.id = menu_item_translations.menu_item_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to manage all menu item translations"
  ON public.menu_item_translations FOR ALL
  USING (get_current_user_admin_status())
  WITH CHECK (get_current_user_admin_status());

-- Create RLS policies for topping category translations
CREATE POLICY "Allow public read access to topping category translations"
  ON public.topping_category_translations FOR SELECT
  USING (true);

CREATE POLICY "Allow restaurant owners to manage their topping category translations"
  ON public.topping_category_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.topping_categories tc
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE tc.id = topping_category_translations.topping_category_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.topping_categories tc
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE tc.id = topping_category_translations.topping_category_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to manage all topping category translations"
  ON public.topping_category_translations FOR ALL
  USING (get_current_user_admin_status())
  WITH CHECK (get_current_user_admin_status());

-- Create RLS policies for topping translations
CREATE POLICY "Allow public read access to topping translations"
  ON public.topping_translations FOR SELECT
  USING (true);

CREATE POLICY "Allow restaurant owners to manage their topping translations"
  ON public.topping_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.toppings t
      JOIN public.topping_categories tc ON t.category_id = tc.id
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE t.id = topping_translations.topping_id 
      AND ro.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.toppings t
      JOIN public.topping_categories tc ON t.category_id = tc.id
      JOIN public.restaurant_owners ro ON tc.restaurant_id = ro.restaurant_id
      WHERE t.id = topping_translations.topping_id 
      AND ro.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to manage all topping translations"
  ON public.topping_translations FOR ALL
  USING (get_current_user_admin_status())
  WITH CHECK (get_current_user_admin_status());

-- Create updated_at triggers for all translation tables
CREATE TRIGGER update_menu_category_translations_updated_at
  BEFORE UPDATE ON public.menu_category_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_item_translations_updated_at
  BEFORE UPDATE ON public.menu_item_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topping_category_translations_updated_at
  BEFORE UPDATE ON public.topping_category_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topping_translations_updated_at
  BEFORE UPDATE ON public.topping_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();