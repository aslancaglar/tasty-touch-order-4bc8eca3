-- Harden function search_path for security
CREATE OR REPLACE FUNCTION public.translate_topping_names()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
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

-- Add search_path hardening for log_security_event as well
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text,
  _title text,
  _description text DEFAULT NULL::text,
  _source_ip text DEFAULT NULL::text,
  _user_id uuid DEFAULT NULL::uuid,
  _restaurant_id uuid DEFAULT NULL::uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    title,
    description,
    source_ip,
    user_id,
    restaurant_id,
    metadata
  )
  VALUES (
    _event_type,
    _severity,
    _title,
    _description,
    _source_ip,
    _user_id,
    _restaurant_id,
    _metadata
  )
  RETURNING id INTO _event_id;
  
  RETURN _event_id;
END;
$function$;