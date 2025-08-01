import { supabase } from "@/integrations/supabase/client";
import { MenuItemWithOptions } from "@/types/database-types";
import { setCacheItem, getCacheItem } from "./cache-service";
import { perfMonitor } from "@/utils/performance-monitor";

export interface BatchMenuItemResult {
  success: boolean;
  data?: MenuItemWithOptions;
  error?: string;
}

export interface BatchMenuItemsResult {
  [itemId: string]: BatchMenuItemResult;
}

// Enhanced batch fetching with advanced optimizations
export const batchGetMenuItemsWithOptions = async (itemIds: string[]): Promise<BatchMenuItemsResult> => {
  if (itemIds.length === 0) {
    return {};
  }

  const uniqueItemIds = [...new Set(itemIds)];
  const perfId = `batch_fetch_${uniqueItemIds.length}_items`;
  
  perfMonitor.start(perfId, { itemCount: uniqueItemIds.length });
  
  try {
    console.log(`[EnhancedBatch] Fetching ${uniqueItemIds.length} menu items with comprehensive join query`);
    
    // Single comprehensive query with all joins
    const { data: menuItemsData, error } = await supabase
      .from("menu_items")
      .select(`
        *,
        menu_item_options!inner (
          id,
          menu_item_id,
          name,
          required,
          multiple,
          option_choices!inner (
            id,
            option_id,
            name,
            price
          )
        ),
        menu_item_topping_categories!inner (
          menu_item_id,
          topping_category_id,
          display_order,
          topping_categories!inner (
            id,
            name,
            description,
            min_selections,
            max_selections,
            display_order,
            show_if_selection_type,
            show_if_selection_id,
            allow_multiple_same_topping,
            name_fr,
            name_en,
            name_tr,
            name_de,
            name_es,
            name_it,
            name_nl,
            name_pt,
            name_ru,
            name_ar,
            name_zh,
            description_fr,
            description_en,
            description_tr,
            description_de,
            description_es,
            description_it,
            description_nl,
            description_pt,
            description_ru,
            description_ar,
            description_zh,
            toppings!inner (
              id,
              name,
              price,
              tax_percentage,
              display_order,
              in_stock,
              name_fr,
              name_en,
              name_tr,
              name_de,
              name_es,
              name_it,
              name_nl,
              name_pt,
              name_ru,
              name_ar,
              name_zh
            )
          )
        )
      `)
      .in("id", uniqueItemIds);

    if (error) {
      console.error("[EnhancedBatch] Error fetching menu items:", error);
      throw error;
    }

    // Process and structure the data
    const result: BatchMenuItemsResult = {};
    
    // Initialize all items as failed
    uniqueItemIds.forEach(id => {
      result[id] = { success: false, error: "Item not found" };
    });

    if (!menuItemsData || menuItemsData.length === 0) {
      console.warn("[EnhancedBatch] No menu items found");
      return result;
    }

    // Group data by menu item
    const itemGroups = new Map<string, any[]>();
    menuItemsData.forEach(item => {
      if (!itemGroups.has(item.id)) {
        itemGroups.set(item.id, []);
      }
      itemGroups.get(item.id)!.push(item);
    });

    // Process each menu item
    itemGroups.forEach((itemRecords, itemId) => {
      try {
        const firstRecord = itemRecords[0];
        
        // Process options
        const optionsMap = new Map<string, any>();
        const choicesMap = new Map<string, any[]>();
        
        itemRecords.forEach(record => {
          if (record.menu_item_options) {
            record.menu_item_options.forEach((option: any) => {
              if (!optionsMap.has(option.id)) {
                optionsMap.set(option.id, {
                  id: option.id,
                  name: option.name,
                  required: option.required || false,
                  multiple: option.multiple || false,
                  choices: []
                });
                choicesMap.set(option.id, []);
              }
              
              if (option.option_choices) {
                option.option_choices.forEach((choice: any) => {
                  const existingChoices = choicesMap.get(option.id)!;
                  if (!existingChoices.find(c => c.id === choice.id)) {
                    existingChoices.push({
                      id: choice.id,
                      name: choice.name,
                      price: choice.price || 0
                    });
                  }
                });
              }
            });
          }
        });

        // Finalize options with choices
        const options = Array.from(optionsMap.values()).map(option => ({
          ...option,
          choices: choicesMap.get(option.id) || []
        }));

        // Process topping categories
        const toppingCategoriesMap = new Map<string, any>();
        const toppingsMap = new Map<string, any[]>();
        const displayOrderMap = new Map<string, number>();

        itemRecords.forEach(record => {
          if (record.menu_item_topping_categories) {
            record.menu_item_topping_categories.forEach((relation: any) => {
              const category = relation.topping_categories;
              if (!category) return;

              displayOrderMap.set(category.id, relation.display_order || category.display_order || 1000);

              if (!toppingCategoriesMap.has(category.id)) {
                toppingCategoriesMap.set(category.id, {
                  id: category.id,
                  name: category.name,
                  description: category.description,
                  min_selections: category.min_selections || 0,
                  max_selections: category.max_selections || 0,
                  required: (category.min_selections && category.min_selections > 0) || false,
                  display_order: displayOrderMap.get(category.id),
                  show_if_selection_type: category.show_if_selection_type,
                  show_if_selection_id: category.show_if_selection_id,
                  allow_multiple_same_topping: category.allow_multiple_same_topping || false,
                  // Multilingual fields
                  name_fr: category.name_fr,
                  name_en: category.name_en,
                  name_tr: category.name_tr,
                  name_de: category.name_de,
                  name_es: category.name_es,
                  name_it: category.name_it,
                  name_nl: category.name_nl,
                  name_pt: category.name_pt,
                  name_ru: category.name_ru,
                  name_ar: category.name_ar,
                  name_zh: category.name_zh,
                  description_fr: category.description_fr,
                  description_en: category.description_en,
                  description_tr: category.description_tr,
                  description_de: category.description_de,
                  description_es: category.description_es,
                  description_it: category.description_it,
                  description_nl: category.description_nl,
                  description_pt: category.description_pt,
                  description_ru: category.description_ru,
                  description_ar: category.description_ar,
                  description_zh: category.description_zh,
                  toppings: []
                });
                toppingsMap.set(category.id, []);
              }

              // Process toppings
              if (category.toppings) {
                category.toppings.forEach((topping: any) => {
                  if (!topping.in_stock) return; // Skip out of stock toppings

                  const existingToppings = toppingsMap.get(category.id)!;
                  if (!existingToppings.find(t => t.id === topping.id)) {
                    existingToppings.push({
                      id: topping.id,
                      name: topping.name,
                      price: topping.price || 0,
                      tax_percentage: topping.tax_percentage || 10,
                      display_order: topping.display_order || 1000,
                      // Multilingual fields
                      name_fr: topping.name_fr,
                      name_en: topping.name_en,
                      name_tr: topping.name_tr,
                      name_de: topping.name_de,
                      name_es: topping.name_es,
                      name_it: topping.name_it,
                      name_nl: topping.name_nl,
                      name_pt: topping.name_pt,
                      name_ru: topping.name_ru,
                      name_ar: topping.name_ar,
                      name_zh: topping.name_zh
                    });
                  }
                });
              }
            });
          }
        });

        // Finalize topping categories with sorted toppings
        const toppingCategories = Array.from(toppingCategoriesMap.values()).map(category => {
          const toppings = toppingsMap.get(category.id) || [];
          // Sort toppings by display_order
          toppings.sort((a, b) => (a.display_order || 1000) - (b.display_order || 1000));
          
          return {
            ...category,
            toppings
          };
        });

        // Sort topping categories by display_order
        toppingCategories.sort((a, b) => (a.display_order || 1000) - (b.display_order || 1000));

        // Create final menu item
        const menuItemWithOptions: MenuItemWithOptions = {
          id: firstRecord.id,
          name: firstRecord.name,
          description: firstRecord.description,
          price: firstRecord.price,
          category_id: firstRecord.category_id,
          image: firstRecord.image,
          in_stock: firstRecord.in_stock,
          promotion_price: firstRecord.promotion_price,
          tax_percentage: firstRecord.tax_percentage,
          display_order: firstRecord.display_order,
          available_from: firstRecord.available_from,
          available_until: firstRecord.available_until,
          created_at: firstRecord.created_at,
          updated_at: firstRecord.updated_at,
          // Multilingual fields
          name_fr: firstRecord.name_fr,
          name_en: firstRecord.name_en,
          name_tr: firstRecord.name_tr,
          name_de: firstRecord.name_de,
          name_es: firstRecord.name_es,
          name_it: firstRecord.name_it,
          name_nl: firstRecord.name_nl,
          name_pt: firstRecord.name_pt,
          name_ru: firstRecord.name_ru,
          name_ar: firstRecord.name_ar,
          name_zh: firstRecord.name_zh,
          description_fr: firstRecord.description_fr,
          description_en: firstRecord.description_en,
          description_tr: firstRecord.description_tr,
          description_de: firstRecord.description_de,
          description_es: firstRecord.description_es,
          description_it: firstRecord.description_it,
          description_nl: firstRecord.description_nl,
          description_pt: firstRecord.description_pt,
          description_ru: firstRecord.description_ru,
          description_ar: firstRecord.description_ar,
          description_zh: firstRecord.description_zh,
          // Structured data
          options,
          toppingCategories
        };

        result[itemId] = {
          success: true,
          data: menuItemWithOptions
        };

      } catch (error) {
        console.error(`[EnhancedBatch] Error processing item ${itemId}:`, error);
        result[itemId] = {
          success: false,
          error: error instanceof Error ? error.message : "Processing error"
        };
      }
    });

    const successCount = Object.values(result).filter(r => r.success).length;
    console.log(`[EnhancedBatch] Successfully processed ${successCount}/${uniqueItemIds.length} items`);

    perfMonitor.end(perfId, { 
      successCount, 
      totalCount: uniqueItemIds.length,
      cacheHits: 0 // Will be updated by caller
    });

    return result;

  } catch (error) {
    console.error("[EnhancedBatch] Batch fetch failed:", error);
    perfMonitor.end(perfId, { error: error instanceof Error ? error.message : "Unknown error" });
    
    // Return error for all items
    const result: BatchMenuItemsResult = {};
    uniqueItemIds.forEach(id => {
      result[id] = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    });
    
    return result;
  }
};

// Optimized single item wrapper
export const getMenuItemWithOptionsOptimized = async (itemId: string): Promise<MenuItemWithOptions | null> => {
  const batchResult = await batchGetMenuItemsWithOptions([itemId]);
  const result = batchResult[itemId];
  
  if (result?.success && result.data) {
    return result.data;
  }
  
  console.warn(`[EnhancedBatch] Failed to fetch item ${itemId}:`, result?.error);
  return null;
};

// Preload utility for cache warming
export const preloadMenuItems = async (itemIds: string[]): Promise<void> => {
  if (itemIds.length === 0) return;
  
  console.log(`[EnhancedBatch] Preloading ${itemIds.length} items for cache warming`);
  
  try {
    const batchResult = await batchGetMenuItemsWithOptions(itemIds);
    
    // Cache successful results in localStorage for persistence
    Object.entries(batchResult).forEach(([itemId, result]) => {
      if (result.success && result.data) {
        const cacheKey = `menuItem_${itemId}`;
        setCacheItem(cacheKey, {
          data: result.data,
          timestamp: Date.now(),
          version: 1
        }, result.data.category_id); // Use category_id as restaurant context
      }
    });
    
    const successCount = Object.values(batchResult).filter(r => r.success).length;
    console.log(`[EnhancedBatch] Preloaded ${successCount}/${itemIds.length} items to cache`);
    
  } catch (error) {
    console.error("[EnhancedBatch] Preload failed:", error);
  }
};