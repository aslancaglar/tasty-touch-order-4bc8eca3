
import { getCacheItem, setCacheItem } from "@/services/cache-service";
import { supabase } from "@/integrations/supabase/client";

/**
 * Prefetches menu item details including options and topping categories
 * @param menuItemId The ID of the menu item to prefetch
 * @param restaurantId The restaurant ID for caching purposes
 */
export const prefetchMenuItemDetails = async (menuItemId: string, restaurantId: string): Promise<void> => {
  try {
    // Check if already cached
    const cacheKey = `menu_item_${menuItemId}_details`;
    if (getCacheItem(cacheKey, restaurantId)) {
      console.log(`Using cached menu item details for ${menuItemId}`);
      return;
    }

    console.log(`Prefetching menu item details for ${menuItemId}`);

    // Use Promise.all to fetch data in parallel rather than sequentially
    const [menuItemResult, optionsResult, toppingCategoryRelationsResult] = await Promise.all([
      // Fetch menu item
      supabase
        .from('menu_items')
        .select('*')
        .eq('id', menuItemId)
        .single(),
      
      // Fetch options
      supabase
        .from('menu_item_options')
        .select('*')
        .eq('menu_item_id', menuItemId),
      
      // Fetch topping categories relation
      supabase
        .from('menu_item_topping_categories')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .order('display_order', { ascending: true })
    ]);

    // Error handling
    if (menuItemResult.error) {
      console.error('Error fetching menu item:', menuItemResult.error);
      return;
    }

    const menuItem = menuItemResult.data;
    let options = optionsResult.error ? [] : optionsResult.data;
    const toppingCategoryRelations = toppingCategoryRelationsResult.error ? [] : toppingCategoryRelationsResult.data;

    // Process options and choices in parallel
    const optionsPromise = Promise.all(
      options.map(async (option) => {
        const { data: choices, error: choicesError } = await supabase
          .from('option_choices')
          .select('*')
          .eq('option_id', option.id);

        if (choicesError) {
          console.error(`Error fetching choices for option ${option.id}:`, choicesError);
          return { ...option, choices: [] };
        }

        return { ...option, choices };
      })
    );

    // Create a map of category ID to display order
    const displayOrderMap = toppingCategoryRelations.reduce((map, relation) => {
      map[relation.topping_category_id] = relation.display_order ?? 1000; // Default to high number if null
      return map;
    }, {} as Record<string, number>);

    // Batch fetch topping categories
    const toppingCategoryIds = toppingCategoryRelations.map(mtc => mtc.topping_category_id);

    let toppingCategories: any[] = [];
    if (toppingCategoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('topping_categories')
        .select('*')
        .in('id', toppingCategoryIds);

      if (!categoriesError && categories) {
        // Fetch all toppings for all categories at once to minimize API calls
        const { data: allToppings, error: toppingsError } = await supabase
          .from('toppings')
          .select('*')
          .in('category_id', toppingCategoryIds)
          .eq('in_stock', true)
          .order('display_order', { ascending: true });

        if (toppingsError) {
          console.error('Error fetching toppings:', toppingsError);
        } else {
          // Group toppings by category for faster assignment
          const toppingsByCategory = allToppings.reduce((groups, topping) => {
            const categoryId = topping.category_id;
            if (!groups[categoryId]) groups[categoryId] = [];
            groups[categoryId].push(topping);
            return groups;
          }, {} as Record<string, any[]>);

          // Map categories with their toppings
          toppingCategories = categories.map(category => ({
            ...category,
            display_order: displayOrderMap[category.id],
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: category.min_selections ? category.min_selections > 0 : false,
            toppings: toppingsByCategory[category.id] || []
          }));

          // Sort by display_order
          toppingCategories.sort((a, b) => {
            const orderA = a.display_order ?? 1000;
            const orderB = b.display_order ?? 1000;
            return orderA - orderB;
          });
        }
      }
    }

    const optionsWithChoices = await optionsPromise;

    // Combine all data
    const completeMenuItem = {
      ...menuItem,
      options: optionsWithChoices,
      toppingCategories
    };

    // Cache the result
    setCacheItem(cacheKey, completeMenuItem, restaurantId);
    console.log(`Menu item ${menuItemId} details cached successfully`);
    
  } catch (error) {
    console.error('Error in prefetchMenuItemDetails:', error);
  }
};

/**
 * Prefetches a list of menu items in the background
 * @param menuItemIds List of menu item IDs to prefetch
 * @param restaurantId The restaurant ID for caching purposes
 */
export const prefetchMenuItems = async (menuItemIds: string[], restaurantId: string): Promise<void> => {
  // Prefetch in small batches to avoid overwhelming the client
  const batchSize = 2;
  
  for (let i = 0; i < menuItemIds.length; i += batchSize) {
    const batch = menuItemIds.slice(i, i + batchSize);
    await Promise.all(batch.map(id => prefetchMenuItemDetails(id, restaurantId)));
    
    // Small delay between batches to avoid performance issues
    if (i + batchSize < menuItemIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};

/**
 * Prefetches menu items for a category
 * @param categoryId The category ID
 * @param restaurantId The restaurant ID for caching
 * @param limit Maximum number of items to prefetch
 */
export const prefetchCategoryItems = async (
  categoryId: string, 
  restaurantId: string,
  limit: number = 10
): Promise<void> => {
  try {
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select('id')
      .eq('category_id', categoryId)
      .limit(limit);
      
    if (error) {
      console.error(`Error fetching menu items for category ${categoryId}:`, error);
      return;
    }
    
    if (menuItems.length > 0) {
      const menuItemIds = menuItems.map(item => item.id);
      prefetchMenuItems(menuItemIds, restaurantId);
    }
  } catch (error) {
    console.error('Error in prefetchCategoryItems:', error);
  }
};
