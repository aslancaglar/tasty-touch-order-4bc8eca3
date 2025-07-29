-- Clear cache by forcing an update to trigger refresh
UPDATE topping_categories 
SET updated_at = now() 
WHERE restaurant_id = '8b72cfce-fcbc-4bb7-aa2f-66f0cd3a39be';

UPDATE toppings 
SET updated_at = now() 
WHERE category_id IN (
  SELECT id FROM topping_categories 
  WHERE restaurant_id = '8b72cfce-fcbc-4bb7-aa2f-66f0cd3a39be'
);