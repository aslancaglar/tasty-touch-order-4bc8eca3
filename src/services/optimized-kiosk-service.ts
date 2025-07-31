import { supabase } from "@/integrations/supabase/client";
import { getCacheItem, setCacheItem, isCachingEnabled } from "@/services/cache-service";

// Cache keys for topping data
const TOPPING_CACHE_KEY = "topping_data";
const MENU_ITEM_CACHE_KEY = "menu_item_details";

interface OptimizedMenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  promotion_price?: number;
  image?: string;
  tax_percentage?: number;
  category_id: string;
  // Multi-language fields
  name_fr?: string;
  name_en?: string;
  name_tr?: string;
  name_pt?: string;
  name_de?: string;
  name_es?: string;
  name_it?: string;
  name_nl?: string;
  name_ru?: string;
  name_ar?: string;
  name_zh?: string;
  description_fr?: string;
  description_en?: string;
  description_tr?: string;
  description_pt?: string;
  description_de?: string;
  description_es?: string;
  description_it?: string;
  description_nl?: string;
  description_ru?: string;
  description_ar?: string;
  description_zh?: string;
  options?: Array<{
    id: string;
    name: string;
    required: boolean;
    multiple: boolean;
    choices: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
  toppingCategories?: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    min_selections: number;
    max_selections: number;
    display_order: number;
    allow_multiple_same_topping: boolean;
    required: boolean;
    // Multi-language fields
    name_fr?: string;
    name_en?: string;
    name_tr?: string;
    name_pt?: string;
    name_de?: string;
    name_es?: string;
    name_it?: string;
    name_nl?: string;
    name_ru?: string;
    name_ar?: string;
    name_zh?: string;
    description_fr?: string;
    description_en?: string;
    description_tr?: string;
    description_pt?: string;
    description_de?: string;
    description_es?: string;
    description_it?: string;
    description_nl?: string;
    description_ru?: string;
    description_ar?: string;
    description_zh?: string;
    toppings: Array<{
      id: string;
      name: string;
      price: number;
      tax_percentage?: number;
      in_stock: boolean;
      display_order: number;
      // Multi-language fields
      name_fr?: string;
      name_en?: string;
      name_tr?: string;
      name_pt?: string;
      name_de?: string;
      name_es?: string;
      name_it?: string;
      name_nl?: string;
      name_ru?: string;
      name_ar?: string;
      name_zh?: string;
    }>;
  }>;
}

interface ToppingCacheData {
  categories: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
    min_selections: number;
    max_selections: number;
    display_order: number;
    allow_multiple_same_topping: boolean;
    restaurant_id: string;
    // Multi-language fields
    name_fr?: string;
    name_en?: string;
    name_tr?: string;
    name_pt?: string;
    name_de?: string;
    name_es?: string;
    name_it?: string;
    name_nl?: string;
    name_ru?: string;
    name_ar?: string;
    name_zh?: string;
    description_fr?: string;
    description_en?: string;
    description_tr?: string;
    description_pt?: string;
    description_de?: string;
    description_es?: string;
    description_it?: string;
    description_nl?: string;
    description_ru?: string;
    description_ar?: string;
    description_zh?: string;
    toppings: Array<{
      id: string;
      name: string;
      price: number;
      tax_percentage?: number;
      in_stock: boolean;
      display_order: number;
      category_id: string;
      // Multi-language fields
      name_fr?: string;
      name_en?: string;
      name_tr?: string;
      name_pt?: string;
      name_de?: string;
      name_es?: string;
      name_it?: string;
      name_nl?: string;
      name_ru?: string;
      name_ar?: string;
      name_zh?: string;
    }>;
  }>;
}

/**
 * Optimized function to get menu item with all details in a single query
 */
export const getOptimizedMenuItemWithDetails = async (
  menuItemId: string,
  restaurantId: string,
  isAdmin = false
): Promise<OptimizedMenuItemData | null> => {
  // Check cache first
  const cacheKey = `${MENU_ITEM_CACHE_KEY}_${menuItemId}`;
  
  if (isCachingEnabled(isAdmin)) {
    const cached = getCacheItem<OptimizedMenuItemData>(cacheKey, restaurantId, isAdmin);
    if (cached) {
      console.log(`[OptimizedKiosk] Using cached menu item data for ${menuItemId}`);
      return cached;
    }
  }

  try {
    console.log(`[OptimizedKiosk] Fetching menu item details for ${menuItemId}`);
    
    // For now, use regular queries until the SQL function is available
    // First get the menu item
    const { data: menuItem, error: menuItemError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .single();

    if (menuItemError) {
      if (menuItemError.code === 'PGRST116') {
        console.log(`[OptimizedKiosk] No menu item found for ID: ${menuItemId}`);
        return null;
      }
      console.error('[OptimizedKiosk] Error fetching menu item:', menuItemError);
      throw menuItemError;
    }

    // Get options with choices in one query
    const { data: options, error: optionsError } = await supabase
      .from('menu_item_options')
      .select(`
        id,
        name,
        required,
        multiple,
        option_choices (
          id,
          name,
          price
        )
      `)
      .eq('menu_item_id', menuItemId);

    if (optionsError) {
      console.error('[OptimizedKiosk] Error fetching options:', optionsError);
      throw optionsError;
    }

    // Get topping categories with toppings in one query
    const { data: toppingRelations, error: relationsError } = await supabase
      .from('menu_item_topping_categories')
      .select(`
        topping_category_id,
        display_order,
        topping_categories (
          id,
          name,
          description,
          icon,
          min_selections,
          max_selections,
          display_order,
          allow_multiple_same_topping,
          name_fr, name_en, name_tr, name_pt, name_de, name_es, name_it, name_nl, name_ru, name_ar, name_zh,
          description_fr, description_en, description_tr, description_pt, description_de, description_es, description_it, description_nl, description_ru, description_ar, description_zh,
          toppings (
            id,
            name,
            price,
            tax_percentage,
            in_stock,
            display_order,
            name_fr, name_en, name_tr, name_pt, name_de, name_es, name_it, name_nl, name_ru, name_ar, name_zh
          )
        )
      `)
      .eq('menu_item_id', menuItemId)
      .order('display_order', { ascending: true });

    if (relationsError) {
      console.error('[OptimizedKiosk] Error fetching topping relations:', relationsError);
      throw relationsError;
    }

    // Transform the data
    const transformedOptions = (options || []).map(option => ({
      id: option.id,
      name: option.name,
      required: option.required,
      multiple: option.multiple,
      choices: (option as any).option_choices || []
    }));

    const transformedToppings = (toppingRelations || []).map(rel => {
      const category = (rel as any).topping_categories;
      return {
        ...category,
        required: category.min_selections > 0,
        toppings: category.toppings || []
      };
    });

    const result: OptimizedMenuItemData = {
      ...menuItem,
      options: transformedOptions,
      toppingCategories: transformedToppings
    };
    
    // Cache the result
    if (isCachingEnabled(isAdmin)) {
      setCacheItem(cacheKey, result, restaurantId, isAdmin);
      console.log(`[OptimizedKiosk] Cached menu item data for ${menuItemId}`);
    }

    return result;
  } catch (error) {
    console.error('[OptimizedKiosk] Failed to fetch menu item details:', error);
    throw error;
  }
};

/**
 * Preload and cache all topping data for a restaurant
 */
export const preloadToppingData = async (
  restaurantId: string,
  isAdmin = false
): Promise<ToppingCacheData> => {
  const cacheKey = `${TOPPING_CACHE_KEY}_${restaurantId}`;
  
  if (isCachingEnabled(isAdmin)) {
    const cached = getCacheItem<ToppingCacheData>(cacheKey, restaurantId, isAdmin);
    if (cached) {
      console.log(`[OptimizedKiosk] Using cached topping data for restaurant ${restaurantId}`);
      return cached;
    }
  }

  try {
    console.log(`[OptimizedKiosk] Preloading topping data for restaurant ${restaurantId}`);
    
    // Fetch all topping categories and their toppings in a single optimized query
    const { data: categories, error: categoriesError } = await supabase
      .from('topping_categories')
      .select(`
        id,
        name,
        description,
        icon,
        min_selections,
        max_selections,
        display_order,
        allow_multiple_same_topping,
        restaurant_id,
        name_fr,
        name_en,
        name_tr,
        name_pt,
        name_de,
        name_es,
        name_it,
        name_nl,
        name_ru,
        name_ar,
        name_zh,
        description_fr,
        description_en,
        description_tr,
        description_pt,
        description_de,
        description_es,
        description_it,
        description_nl,
        description_ru,
        description_ar,
        description_zh,
        toppings (
          id,
          name,
          price,
          tax_percentage,
          in_stock,
          display_order,
          category_id,
          name_fr,
          name_en,
          name_tr,
          name_pt,
          name_de,
          name_es,
          name_it,
          name_nl,
          name_ru,
          name_ar,
          name_zh
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('display_order', { ascending: true });

    if (categoriesError) {
      console.error('[OptimizedKiosk] Error fetching topping categories:', categoriesError);
      throw categoriesError;
    }

    const result: ToppingCacheData = {
      categories: categories || []
    };

    // Cache the result
    if (isCachingEnabled(isAdmin)) {
      setCacheItem(cacheKey, result, restaurantId, isAdmin);
      console.log(`[OptimizedKiosk] Cached topping data for restaurant ${restaurantId}`);
    }

    return result;
  } catch (error) {
    console.error('[OptimizedKiosk] Failed to preload topping data:', error);
    throw error;
  }
};

/**
 * Get cached topping categories for a restaurant
 */
export const getCachedToppingCategories = (restaurantId: string, isAdmin = false): ToppingCacheData | null => {
  const cacheKey = `${TOPPING_CACHE_KEY}_${restaurantId}`;
  return getCacheItem<ToppingCacheData>(cacheKey, restaurantId, isAdmin);
};

/**
 * Optimized function to get menu item options
 */
export const getOptimizedMenuItemOptions = async (
  menuItemId: string,
  restaurantId: string,
  isAdmin = false
): Promise<Array<{
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  choices: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}>> => {
  const cacheKey = `menu_item_options_${menuItemId}`;
  
  if (isCachingEnabled(isAdmin)) {
    const cached = getCacheItem<any[]>(cacheKey, restaurantId, isAdmin);
    if (cached) {
      console.log(`[OptimizedKiosk] Using cached options for menu item ${menuItemId}`);
      return cached;
    }
  }

  try {
    console.log(`[OptimizedKiosk] Fetching options for menu item ${menuItemId}`);
    
    const { data: options, error } = await supabase
      .from('menu_item_options')
      .select(`
        id,
        name,
        required,
        multiple,
        option_choices (
          id,
          name,
          price
        )
      `)
      .eq('menu_item_id', menuItemId);

    if (error) {
      console.error('[OptimizedKiosk] Error fetching menu item options:', error);
      throw error;
    }

    const result = (options || []).map(option => ({
      id: option.id,
      name: option.name,
      required: option.required,
      multiple: option.multiple,
      choices: (option as any).option_choices || []
    }));

    // Cache the result
    if (isCachingEnabled(isAdmin)) {
      setCacheItem(cacheKey, result, restaurantId, isAdmin);
      console.log(`[OptimizedKiosk] Cached options for menu item ${menuItemId}`);
    }

    return result;
  } catch (error) {
    console.error('[OptimizedKiosk] Failed to fetch menu item options:', error);
    throw error;
  }
};

/**
 * Clear all optimized cache data
 */
export const clearOptimizedCache = (restaurantId: string): void => {
  console.log(`[OptimizedKiosk] Clearing optimized cache for restaurant ${restaurantId}`);
  
  // Clear topping cache
  const toppingCacheKey = `${TOPPING_CACHE_KEY}_${restaurantId}`;
  localStorage.removeItem(`qimbo_cache_${toppingCacheKey}_${restaurantId}`);
  
  // Clear menu item caches (we don't know all IDs, so we'll clear by pattern)
  Object.keys(localStorage).forEach(key => {
    if (key.includes(`qimbo_cache_${MENU_ITEM_CACHE_KEY}`) && key.includes(restaurantId)) {
      localStorage.removeItem(key);
    }
    if (key.includes(`qimbo_cache_menu_item_options`) && key.includes(restaurantId)) {
      localStorage.removeItem(key);
    }
  });
  
  console.log(`[OptimizedKiosk] Cleared optimized cache for restaurant ${restaurantId}`);
};