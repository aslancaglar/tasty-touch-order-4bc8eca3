-- Add language-specific columns for menu items
ALTER TABLE menu_items 
ADD COLUMN name_fr TEXT,
ADD COLUMN name_en TEXT,
ADD COLUMN name_tr TEXT,
ADD COLUMN description_fr TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN description_tr TEXT;

-- Add language-specific columns for menu categories
ALTER TABLE menu_categories
ADD COLUMN name_fr TEXT,
ADD COLUMN name_en TEXT,
ADD COLUMN name_tr TEXT,
ADD COLUMN description_fr TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN description_tr TEXT;

-- Add language-specific columns for toppings
ALTER TABLE toppings
ADD COLUMN name_fr TEXT,
ADD COLUMN name_en TEXT,
ADD COLUMN name_tr TEXT;

-- Add language-specific columns for topping categories
ALTER TABLE topping_categories
ADD COLUMN name_fr TEXT,
ADD COLUMN name_en TEXT,
ADD COLUMN name_tr TEXT,
ADD COLUMN description_fr TEXT,
ADD COLUMN description_en TEXT,
ADD COLUMN description_tr TEXT;

-- Migrate existing data to French columns (since French is the default language)
UPDATE menu_items SET name_fr = name, description_fr = description;
UPDATE menu_categories SET name_fr = name, description_fr = description;
UPDATE toppings SET name_fr = name;
UPDATE topping_categories SET name_fr = name, description_fr = description;