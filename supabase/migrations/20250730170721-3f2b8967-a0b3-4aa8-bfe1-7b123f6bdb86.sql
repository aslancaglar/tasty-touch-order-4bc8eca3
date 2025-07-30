-- Add missing Portuguese language columns to menu_categories
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_pt TEXT,
ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Add missing Portuguese language columns to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_pt TEXT,
ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Add missing Portuguese language columns to topping_categories
ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_pt TEXT,
ADD COLUMN IF NOT EXISTS description_pt TEXT;

-- Add missing Portuguese language columns to toppings
ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_pt TEXT;

-- Also add other missing language columns that might be missing
-- German
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_de TEXT,
ADD COLUMN IF NOT EXISTS description_de TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_de TEXT,
ADD COLUMN IF NOT EXISTS description_de TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_de TEXT,
ADD COLUMN IF NOT EXISTS description_de TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_de TEXT;

-- Spanish
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_es TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_es TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_es TEXT,
ADD COLUMN IF NOT EXISTS description_es TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_es TEXT;

-- Italian
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_it TEXT,
ADD COLUMN IF NOT EXISTS description_it TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_it TEXT,
ADD COLUMN IF NOT EXISTS description_it TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_it TEXT,
ADD COLUMN IF NOT EXISTS description_it TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_it TEXT;

-- Dutch
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_nl TEXT,
ADD COLUMN IF NOT EXISTS description_nl TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_nl TEXT,
ADD COLUMN IF NOT EXISTS description_nl TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_nl TEXT,
ADD COLUMN IF NOT EXISTS description_nl TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_nl TEXT;

-- Russian
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_ru TEXT,
ADD COLUMN IF NOT EXISTS description_ru TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_ru TEXT;

-- Arabic
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_ar TEXT;

-- Chinese
ALTER TABLE public.menu_categories 
ADD COLUMN IF NOT EXISTS name_zh TEXT,
ADD COLUMN IF NOT EXISTS description_zh TEXT;

ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS name_zh TEXT,
ADD COLUMN IF NOT EXISTS description_zh TEXT;

ALTER TABLE public.topping_categories 
ADD COLUMN IF NOT EXISTS name_zh TEXT,
ADD COLUMN IF NOT EXISTS description_zh TEXT;

ALTER TABLE public.toppings 
ADD COLUMN IF NOT EXISTS name_zh TEXT;