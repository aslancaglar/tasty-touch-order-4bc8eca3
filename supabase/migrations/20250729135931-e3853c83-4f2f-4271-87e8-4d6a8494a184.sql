-- Clear all cache data by updating the updated_at field for topping categories to force cache refresh
-- This will trigger cache invalidation for all topping category related data

UPDATE topping_categories 
SET updated_at = now() 
WHERE restaurant_id IN (
  SELECT id FROM restaurants WHERE slug LIKE '%green-kebab%'
);