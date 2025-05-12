
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

    // Fetch menu item
    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .single();

    if (menuItemError) {
      console.error('Error fetching menu item:', menuItemError);
      return;
    }

    // Fetch options
    const { data: options, error: optionsError } = await supabase
      .from('menu_item_options')
      .select('*')
      .eq('menu_item_id', menuItemId);

    if (optionsError) {
      console.error('Error fetching options:', optionsError);
      return;
    }

    // Fetch choices for each option
    const optionsWithChoices = await Promise.all(
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

    // Fetch topping categories relation
    const { data: toppingCategoryRelations, error: relationsError } = await supabase
      .from('menu_item_topping_categories')
      .select('*')
      .eq('menu_item_id', menuItemId);

    if (relationsError) {
      console.error('Error fetching topping category relations:', relationsError);
      return;
    }

    // Fetch topping categories
    const toppingCategoriesPromises = toppingCategoryRelations.map(async (relation) => {
      const { data: category, error: categoryError } = await supabase
        .from('topping_categories')
        .select('*')
        .eq('id', relation.topping_category_id)
        .single();

      if (categoryError) {
        console.error(`Error fetching topping category ${relation.topping_category_id}:`, categoryError);
        return null;
      }

      // Fetch toppings
      const { data: toppings, error: toppingsError } = await supabase
        .from('toppings')
        .select('*')
        .eq('category_id', category.id)
        .eq('in_stock', true);

      if (toppingsError) {
        console.error(`Error fetching toppings for category ${category.id}:`, toppingsError);
        return { ...category, toppings: [] };
      }

      return {
        ...category,
        toppings,
        display_order: relation.display_order
      };
    });

    const toppingCategories = (await Promise.all(toppingCategoriesPromises)).filter(Boolean);

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
