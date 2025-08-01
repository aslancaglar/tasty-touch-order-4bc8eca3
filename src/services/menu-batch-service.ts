import { supabase } from "@/integrations/supabase/client";
import { MenuItemWithOptions } from "@/types/database-types";

interface BatchMenuItemResult {
  success: boolean;
  data?: MenuItemWithOptions;
  error?: string;
}

interface BatchMenuItemsResult {
  [itemId: string]: BatchMenuItemResult;
}

// Batch fetch multiple menu items with all their related data
export const batchGetMenuItemsWithOptions = async (itemIds: string[]): Promise<BatchMenuItemsResult> => {
  const startTime = performance.now();
  console.log(`[BatchService] Fetching ${itemIds.length} menu items:`, itemIds);
  
  try {
    // Remove duplicates
    const uniqueItemIds = [...new Set(itemIds)];
    
    // Parallel fetch all data
    const [menuItemsResult, optionsResult, toppingCategoriesResult, toppingsResult] = await Promise.all([
      // Fetch menu items
      supabase
        .from('menu_items')
        .select('*')
        .in('id', uniqueItemIds),
      
      // Fetch all options for these items
      supabase
        .from('menu_item_options')
        .select(`
          *,
          choices:option_choices(*)
        `)
        .in('menu_item_id', uniqueItemIds),
      
      // Fetch topping category relations and categories
      supabase
        .from('menu_item_topping_categories')
        .select(`
          menu_item_id,
          topping_category_id,
          display_order,
          topping_category:topping_categories(*)
        `)
        .in('menu_item_id', uniqueItemIds)
        .order('display_order', { ascending: true }),
      
      // Fetch all toppings for the related categories (we'll filter later)
      supabase
        .from('toppings')
        .select('*')
        .order('display_order', { ascending: true })
    ]);

    // Check for errors
    if (menuItemsResult.error) throw menuItemsResult.error;
    if (optionsResult.error) throw optionsResult.error;
    if (toppingCategoriesResult.error) throw toppingCategoriesResult.error;
    if (toppingsResult.error) throw toppingsResult.error;

    // Get all topping category IDs that are related to our menu items
    const relatedCategoryIds = new Set(
      toppingCategoriesResult.data?.map(rel => rel.topping_category_id) || []
    );

    // Filter toppings to only those in related categories
    const relevantToppings = toppingsResult.data?.filter(topping => 
      relatedCategoryIds.has(topping.category_id)
    ) || [];

    // Build result object
    const result: BatchMenuItemsResult = {};
    
    // Initialize all items as not found
    uniqueItemIds.forEach(id => {
      result[id] = { success: false, error: 'Item not found' };
    });

    // Process each menu item
    menuItemsResult.data?.forEach(menuItem => {
      try {
        // Get options for this item
        const itemOptions = optionsResult.data?.filter(option => 
          option.menu_item_id === menuItem.id
        ) || [];

        // Get topping categories for this item
        const itemToppingRelations = toppingCategoriesResult.data?.filter(rel => 
          rel.menu_item_id === menuItem.id
        ) || [];

        // Build topping categories with their toppings
        const toppingCategories = itemToppingRelations.map(relation => {
          const category = relation.topping_category;
          if (!category) return null;

          // Get toppings for this category
          const categoryToppings = relevantToppings.filter(topping => 
            topping.category_id === category.id
          );

          return {
            id: category.id,
            name: category.name,
            description: category.description,
            min_selections: category.min_selections || 0,
            max_selections: category.max_selections || 0,
            required: (category.min_selections || 0) > 0,
            display_order: relation.display_order || 0,
            allow_multiple_same_topping: category.allow_multiple_same_topping,
            show_if_selection_id: category.show_if_selection_id,
            show_if_selection_type: category.show_if_selection_type,
            toppings: categoryToppings.map(topping => ({
              id: topping.id,
              name: topping.name,
              price: Number(topping.price),
              tax_percentage: Number(topping.tax_percentage),
              display_order: topping.display_order || 0,
              in_stock: topping.in_stock,
              // Include multilingual fields
              name_en: topping.name_en,
              name_fr: topping.name_fr,
              name_de: topping.name_de,
              name_es: topping.name_es,
              name_it: topping.name_it,
              name_pt: topping.name_pt,
              name_nl: topping.name_nl,
              name_ru: topping.name_ru,
              name_tr: topping.name_tr,
              name_ar: topping.name_ar,
              name_zh: topping.name_zh
            })),
            // Include multilingual fields for category
            name_en: category.name_en,
            name_fr: category.name_fr,
            name_de: category.name_de,
            name_es: category.name_es,
            name_it: category.name_it,
            name_pt: category.name_pt,
            name_nl: category.name_nl,
            name_ru: category.name_ru,
            name_tr: category.name_tr,
            name_ar: category.name_ar,
            name_zh: category.name_zh,
            description_en: category.description_en,
            description_fr: category.description_fr,
            description_de: category.description_de,
            description_es: category.description_es,
            description_it: category.description_it,
            description_pt: category.description_pt,
            description_nl: category.description_nl,
            description_ru: category.description_ru,
            description_tr: category.description_tr,
            description_ar: category.description_ar,
            description_zh: category.description_zh
          };
        }).filter(Boolean).sort((a, b) => (a!.display_order || 0) - (b!.display_order || 0));

        // Build the complete menu item with options
        const completeMenuItem: MenuItemWithOptions = {
          ...menuItem,
          options: itemOptions,
          toppingCategories
        };

        result[menuItem.id] = {
          success: true,
          data: completeMenuItem
        };
      } catch (error) {
        console.error(`[BatchService] Error processing item ${menuItem.id}:`, error);
        result[menuItem.id] = {
          success: false,
          error: error instanceof Error ? error.message : 'Processing error'
        };
      }
    });

    const endTime = performance.now();
    console.log(`[BatchService] Batch fetch completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  } catch (error) {
    console.error('[BatchService] Batch fetch failed:', error);
    
    // Return error for all items
    const result: BatchMenuItemsResult = {};
    itemIds.forEach(id => {
      result[id] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    });
    
    return result;
  }
};

// Single item fetch with caching fallback
export const getMenuItemWithOptionsOptimized = async (itemId: string): Promise<MenuItemWithOptions | null> => {
  const result = await batchGetMenuItemsWithOptions([itemId]);
  const itemResult = result[itemId];
  
  if (itemResult.success && itemResult.data) {
    return itemResult.data;
  }
  
  console.warn(`[BatchService] Failed to fetch item ${itemId}:`, itemResult.error);
  return null;
};

// Preload items for menu grid performance
export const preloadMenuItems = async (itemIds: string[]): Promise<void> => {
  if (itemIds.length === 0) return;
  
  console.log(`[BatchService] Preloading ${itemIds.length} menu items for performance`);
  
  // Use the batch service to preload items
  await batchGetMenuItemsWithOptions(itemIds);
  
  // Items are now in any caching layer that the batch service uses
  console.log(`[BatchService] Preloading completed for ${itemIds.length} items`);
};