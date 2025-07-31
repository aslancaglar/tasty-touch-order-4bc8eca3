-- Fix database function security by setting proper search paths for security definer functions
-- This addresses the "Function Search Path Mutable" warnings from the linter

-- Fix function: translate_topping_names
DROP FUNCTION IF EXISTS public.translate_topping_names();
CREATE OR REPLACE FUNCTION public.translate_topping_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Update topping categories with automatic translations
    FOR rec IN SELECT id, name FROM topping_categories WHERE name_en IS NULL OR name_tr IS NULL
    LOOP
        UPDATE topping_categories SET
            name_en = CASE 
                WHEN name ILIKE '%sauce%' OR name ILIKE '%sauces%' THEN REPLACE(REPLACE(REPLACE(UPPER(name), 'SAUCE', 'SAUCE'), 'SAUCES', 'SAUCES'), 'CRUDITÉS', 'VEGETABLES')
                WHEN name ILIKE '%viande%' OR name ILIKE '%viandes%' THEN REPLACE(REPLACE(UPPER(name), 'VIANDE', 'MEAT'), 'VIANDES', 'MEATS')
                WHEN name ILIKE '%seul%' THEN REPLACE(UPPER(name), 'SEUL', 'ALONE')
                WHEN name ILIKE '%avec frites%' THEN REPLACE(UPPER(name), 'AVEC FRITES', 'WITH FRIES')
                WHEN name ILIKE '%menu%' THEN REPLACE(UPPER(name), 'MENU', 'COMBO')
                ELSE UPPER(name)
            END,
            name_tr = CASE 
                WHEN name ILIKE '%sauce%' OR name ILIKE '%sauces%' THEN REPLACE(REPLACE(REPLACE(UPPER(name), 'SAUCE', 'SOS'), 'SAUCES', 'SOSLAR'), 'CRUDITÉS', 'SEBZELER')
                WHEN name ILIKE '%viande%' OR name ILIKE '%viandes%' THEN REPLACE(REPLACE(UPPER(name), 'VIANDE', 'ET'), 'VIANDES', 'ETLER')
                WHEN name ILIKE '%seul%' THEN REPLACE(UPPER(name), 'SEUL', 'TEK')
                WHEN name ILIKE '%avec frites%' THEN REPLACE(UPPER(name), 'AVEC FRITES', 'PATATESLE')
                WHEN name ILIKE '%menu%' THEN REPLACE(UPPER(name), 'MENU', 'MENU')
                ELSE UPPER(name)
            END
        WHERE id = rec.id;
    END LOOP;

    -- Update toppings with automatic translations
    FOR rec IN SELECT id, name FROM toppings WHERE name_en IS NULL OR name_tr IS NULL
    LOOP
        UPDATE toppings SET
            name_en = CASE 
                WHEN name ILIKE '%sauce blanche%' THEN 'White Sauce'
                WHEN name ILIKE '%sauce%' THEN REPLACE(name, 'Sauce', 'Sauce')
                WHEN name ILIKE '%mozzarella%' THEN 'Mozzarella'
                WHEN name ILIKE '%seul%' THEN 'Alone'
                WHEN name ILIKE '%avec frites%' THEN 'With Fries'
                WHEN name ILIKE '%menu%' THEN 'Combo'
                WHEN name ILIKE '%nuggets%' THEN 'Nuggets'
                WHEN name ILIKE '%kofte%' THEN 'Meatballs'
                WHEN name ILIKE '%kebab%' THEN REPLACE(REPLACE(name, 'Kebab - ', ''), 'Veau Dinde', 'Veal Turkey')
                WHEN name ILIKE '%poulet%' THEN REPLACE(name, 'Poulet', 'Chicken')
                WHEN name ILIKE '%dinde%' THEN REPLACE(name, 'Dinde', 'Turkey')
                WHEN name ILIKE '%veau%' THEN REPLACE(name, 'Veau', 'Veal')
                ELSE name
            END,
            name_tr = CASE 
                WHEN name ILIKE '%sauce blanche%' THEN 'Beyaz Sos'
                WHEN name ILIKE '%sauce%' THEN REPLACE(name, 'Sauce', 'Sos')
                WHEN name ILIKE '%mozzarella%' THEN 'Mozzarella'
                WHEN name ILIKE '%seul%' THEN 'Tek'
                WHEN name ILIKE '%avec frites%' THEN 'Patatesle'
                WHEN name ILIKE '%menu%' THEN 'Menu'
                WHEN name ILIKE '%nuggets%' THEN 'Nuggets'
                WHEN name ILIKE '%kofte%' THEN 'Köfte'
                WHEN name ILIKE '%kebab%' THEN REPLACE(REPLACE(name, 'Kebab - ', ''), 'Veau Dinde', 'Dana Hindi')
                WHEN name ILIKE '%poulet%' THEN REPLACE(name, 'Poulet', 'Tavuk')
                WHEN name ILIKE '%dinde%' THEN REPLACE(name, 'Dinde', 'Hindi')
                WHEN name ILIKE '%veau%' THEN REPLACE(name, 'Veau', 'Dana')
                ELSE name
            END
        WHERE id = rec.id;
    END LOOP;
END;
$$;

-- Fix function: duplicate_restaurant
DROP FUNCTION IF EXISTS public.duplicate_restaurant(uuid);
CREATE OR REPLACE FUNCTION public.duplicate_restaurant(source_restaurant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    new_restaurant_id UUID;
    old_category_id UUID;
    new_category_id UUID;
    old_topping_category_id UUID;
    new_topping_category_id UUID;
    old_menu_item_id UUID;
    new_menu_item_id UUID;
    source_restaurant restaurants%ROWTYPE;
BEGIN
    -- Get source restaurant details
    SELECT * INTO source_restaurant FROM restaurants WHERE id = source_restaurant_id;
    
    -- Create new restaurant
    INSERT INTO restaurants (
        name,
        location,
        image_url,
        ui_language,
        currency,
        slug
    ) 
    VALUES (
        source_restaurant.name || ' (Copy)',
        source_restaurant.location,
        source_restaurant.image_url,
        source_restaurant.ui_language,
        source_restaurant.currency,
        source_restaurant.slug || '-copy-' || FLOOR(RANDOM() * 1000)::TEXT
    )
    RETURNING id INTO new_restaurant_id;

    -- Copy menu categories
    FOR old_category_id IN SELECT id FROM menu_categories WHERE restaurant_id = source_restaurant_id
    LOOP
        WITH new_category AS (
            INSERT INTO menu_categories (
                restaurant_id,
                name,
                description,
                icon,
                image_url,
                display_order
            )
            SELECT 
                new_restaurant_id,
                name,
                description,
                icon,
                image_url,
                display_order
            FROM menu_categories
            WHERE id = old_category_id
            RETURNING id
        )
        SELECT id INTO new_category_id FROM new_category;

        -- Copy menu items for this category
        FOR old_menu_item_id IN SELECT id FROM menu_items WHERE category_id = old_category_id
        LOOP
            WITH new_menu_item AS (
                INSERT INTO menu_items (
                    category_id,
                    name,
                    description,
                    price,
                    promotion_price,
                    image,
                    tax_percentage,
                    display_order
                )
                SELECT 
                    new_category_id,
                    name,
                    description,
                    price,
                    promotion_price,
                    image,
                    tax_percentage,
                    display_order
                FROM menu_items
                WHERE id = old_menu_item_id
                RETURNING id
            )
            SELECT id INTO new_menu_item_id FROM new_menu_item;

            -- Copy menu item options
            INSERT INTO menu_item_options (
                menu_item_id,
                name,
                required,
                multiple
            )
            SELECT 
                new_menu_item_id,
                name,
                required,
                multiple
            FROM menu_item_options
            WHERE menu_item_id = old_menu_item_id;

            -- Copy option choices
            INSERT INTO option_choices (
                option_id,
                name,
                price
            )
            SELECT 
                new_options.id,
                oc.name,
                oc.price
            FROM option_choices oc
            JOIN menu_item_options old_options ON oc.option_id = old_options.id
            JOIN menu_item_options new_options 
                ON new_options.menu_item_id = new_menu_item_id 
                AND new_options.name = old_options.name
            WHERE old_options.menu_item_id = old_menu_item_id;
        END LOOP;
    END LOOP;

    -- Copy topping categories
    FOR old_topping_category_id IN SELECT id FROM topping_categories WHERE restaurant_id = source_restaurant_id
    LOOP
        WITH new_topping_category AS (
            INSERT INTO topping_categories (
                restaurant_id,
                name,
                description,
                icon,
                min_selections,
                max_selections,
                display_order,
                show_if_selection_type,
                show_if_selection_id
            )
            SELECT 
                new_restaurant_id,
                name,
                description,
                icon,
                min_selections,
                max_selections,
                display_order,
                show_if_selection_type,
                show_if_selection_id
            FROM topping_categories
            WHERE id = old_topping_category_id
            RETURNING id
        )
        SELECT id INTO new_topping_category_id FROM new_topping_category;

        -- Copy toppings
        INSERT INTO toppings (
            category_id,
            name,
            price,
            tax_percentage
        )
        SELECT 
            new_topping_category_id,
            name,
            price,
            tax_percentage
        FROM toppings
        WHERE category_id = old_topping_category_id;
    END LOOP;

    -- FIXED: Clear any existing relationship data for the new restaurant items first
    -- This prevents potential conflicts with the unique constraint
    DELETE FROM menu_item_topping_categories mitc
    USING menu_items mi, menu_categories mc
    WHERE mitc.menu_item_id = mi.id
      AND mi.category_id = mc.id
      AND mc.restaurant_id = new_restaurant_id;

    -- Copy menu item topping categories relationships with improved mapping to avoid conflicts
    INSERT INTO menu_item_topping_categories (
        menu_item_id,
        topping_category_id,
        display_order
    )
    SELECT 
        new_menu_items.id,
        new_topping_categories.id,
        mitc.display_order
    FROM menu_item_topping_categories mitc
    JOIN menu_items old_menu_items ON mitc.menu_item_id = old_menu_items.id
    JOIN menu_categories old_categories ON old_menu_items.category_id = old_categories.id
    JOIN menu_categories new_categories 
        ON new_categories.restaurant_id = new_restaurant_id 
        AND new_categories.name = old_categories.name
    JOIN menu_items new_menu_items 
        ON new_menu_items.category_id = new_categories.id 
        AND new_menu_items.name = old_menu_items.name
    JOIN topping_categories old_topping_categories ON mitc.topping_category_id = old_topping_categories.id
    JOIN topping_categories new_topping_categories 
        ON new_topping_categories.restaurant_id = new_restaurant_id 
        AND new_topping_categories.name = old_topping_categories.name
    ON CONFLICT DO NOTHING; -- Added to prevent errors if there are duplicates

    RETURN new_restaurant_id;
END;
$$;