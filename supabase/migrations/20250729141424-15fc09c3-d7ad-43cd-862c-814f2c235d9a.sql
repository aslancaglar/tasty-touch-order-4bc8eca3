-- Force cache refresh by updating timestamps for Green Kebab restaurant
UPDATE topping_categories 
SET updated_at = now() 
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE slug LIKE '%green-kebab%'
);

UPDATE toppings 
SET updated_at = now() 
WHERE category_id IN (
  SELECT id FROM topping_categories 
  WHERE restaurant_id IN (
    SELECT id FROM restaurants WHERE slug LIKE '%green-kebab%'
  )
);