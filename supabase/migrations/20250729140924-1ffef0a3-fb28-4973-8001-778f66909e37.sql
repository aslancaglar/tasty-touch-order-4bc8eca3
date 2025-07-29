-- Add automatic translation function for topping categories and toppings
CREATE OR REPLACE FUNCTION translate_topping_names()
RETURNS void
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Execute the translation function
SELECT translate_topping_names();

-- Update cache timestamps to force refresh
UPDATE topping_categories SET updated_at = now();
UPDATE toppings SET updated_at = now();