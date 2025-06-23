
-- Fix Function Search Path Mutable issues by setting search_path to 'public'
-- This prevents potential security vulnerabilities from search path manipulation

-- Fix is_restaurant_owner_of_order_item function
CREATE OR REPLACE FUNCTION public.is_restaurant_owner_of_order_item_option(order_item_option_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.order_item_options oio
    JOIN public.order_items oi ON oio.order_item_id = oi.id
    JOIN public.orders o ON oi.order_id = o.id
    JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
    WHERE oio.id = order_item_option_id AND ro.user_id = auth.uid()
  );
$$;

-- Fix is_restaurant_owner_of_order function
CREATE OR REPLACE FUNCTION public.is_restaurant_owner_of_order(order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.orders o
    JOIN public.restaurant_owners ro ON o.restaurant_id = ro.restaurant_id
    WHERE o.id = order_id AND ro.user_id = auth.uid()
  );
$$;

-- Fix get_user_restaurant_ids function
CREATE OR REPLACE FUNCTION public.get_user_restaurant_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ARRAY(
    SELECT restaurant_id FROM public.restaurant_owners 
    WHERE user_id = auth.uid()
  );
$$;

-- Fix get_current_user_admin_status function
CREATE OR REPLACE FUNCTION public.get_current_user_admin_status()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- Fix is_restaurant_owner function
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(restaurant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurant_owners 
    WHERE restaurant_id = restaurant_uuid AND user_id = auth.uid()
  );
$$;

-- Also fix other functions that might have the same issue
CREATE OR REPLACE FUNCTION public.get_owned_restaurants()
RETURNS SETOF restaurants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
    SELECT r.*
    FROM public.restaurants r
    JOIN public.restaurant_owners ro ON r.id = ro.restaurant_id
    WHERE ro.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_popular_restaurants(limit_count integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
SELECT
  jsonb_agg(
    jsonb_build_object(
      'name', r.name,
      'total_orders', restaurant_orders.total_orders
    ) ORDER BY restaurant_orders.total_orders DESC
  )
FROM (
  SELECT
    o.restaurant_id,
    COUNT(o.id) AS total_orders
  FROM
    public.orders AS o
  WHERE 
    o.status != 'cancelled'
  GROUP BY
    o.restaurant_id
  ORDER BY
    total_orders DESC
  LIMIT limit_count
) AS restaurant_orders
JOIN public.restaurants AS r ON restaurant_orders.restaurant_id = r.id;
$$;

CREATE OR REPLACE FUNCTION public.is_menu_item_available_now(item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    item_record menu_items%ROWTYPE;
    current_time_var TIME;
BEGIN
    SELECT * INTO item_record FROM menu_items WHERE id = item_id;
    
    -- If no availability times set, item is always available
    IF item_record.available_from IS NULL OR item_record.available_until IS NULL THEN
        RETURN TRUE;
    END IF;
    
    current_time_var := LOCALTIME;
    
    -- Check if current time falls within availability window
    IF item_record.available_from <= item_record.available_until THEN
        -- Normal time range (e.g., 11:00 to 14:00)
        RETURN current_time_var >= item_record.available_from AND current_time_var <= item_record.available_until;
    ELSE
        -- Time range spans midnight (e.g., 22:00 to 02:00)
        RETURN current_time_var >= item_record.available_from OR current_time_var <= item_record.available_until;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_order_count()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.orders
  WHERE
    created_at >= date_trunc('day', now())
    AND created_at < date_trunc('day', now()) + interval '1 day'
    AND status != 'cancelled';
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_order_count()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.orders
  WHERE
    created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month'
    AND status != 'cancelled';
$$;

CREATE OR REPLACE FUNCTION public.duplicate_restaurant(source_restaurant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
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

CREATE OR REPLACE FUNCTION public.get_popular_items(limit_count integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
WITH item_counts AS (
  SELECT
    oi.menu_item_id,
    COUNT(oi.id) AS order_count
  FROM
    public.order_items AS oi
  JOIN
    public.orders AS o ON oi.order_id = o.id
  WHERE
    o.status != 'cancelled'
  GROUP BY
    oi.menu_item_id
  ORDER BY
    order_count DESC
  LIMIT limit_count
),
ranked_items AS (
  SELECT
    mi.name,
    mi.price,
    r.name as restaurant_name,
    item_counts.order_count
  FROM item_counts
  JOIN public.menu_items AS mi ON item_counts.menu_item_id = mi.id
  JOIN public.menu_categories AS mc ON mi.category_id = mc.id
  JOIN public.restaurants AS r ON mc.restaurant_id = r.id
  ORDER BY item_counts.order_count DESC
)
SELECT
  jsonb_agg(
    jsonb_build_object(
      'name', ranked_items.name,
      'price', ranked_items.price,
      'restaurant_name', ranked_items.restaurant_name,
      'order_count', ranked_items.order_count
    ) ORDER BY ranked_items.order_count DESC
  )
FROM ranked_items;
$$;
