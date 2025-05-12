
import { supabase } from "@/integrations/supabase/client";
import { setCacheItem, getCacheItem, clearCache } from "./cache-service";
import { shouldPreloadOnKioskInit } from "./cache-config";
import { Restaurant, MenuCategory, MenuItem, ToppingCategory, Topping } from "@/types/database-types";

/**
 * Data preloader service for the Kiosk View
 * Handles preloading essential data and managing its lifecycle
 */

// Cache keys for different data types
export const CACHE_KEYS = {
  RESTAURANT: 'restaurant',
  CATEGORIES: 'categories',
  MENU_ITEMS: 'menu_items',
  MENU_ITEM_PREFIX: 'menu_item_', // Will be followed by item ID
  TOPPING_CATEGORIES: 'topping_categories',
  TOPPINGS_PREFIX: 'toppings_', // Will be followed by category ID
};

/**
 * Preloads all essential data for a restaurant
 * @param restaurantId The ID of the restaurant to preload data for
 * @param slug The slug of the restaurant, used for restaurant data lookup
 * @returns An object containing all preloaded data
 */
export const preloadRestaurantData = async (
  restaurantId: string, 
  slug: string
): Promise<{
  restaurant: Restaurant | null;
  categories: (MenuCategory & { items: MenuItem[] })[];
  toppingCategories: (ToppingCategory & { toppings: Topping[] })[];
}> => {
  console.log(`🚀 Preloading data for restaurant: ${restaurantId} (${slug})`);
  
  // Check if preloading is disabled by configuration
  if (!shouldPreloadOnKioskInit()) {
    console.log('Preloading disabled by configuration');
    return {
      restaurant: null,
      categories: [],
      toppingCategories: []
    };
  }

  try {
    // Preload restaurant data
    const restaurant = await preloadRestaurantBySlug(slug);
    if (!restaurant) {
      console.error('Failed to preload restaurant data');
      return {
        restaurant: null,
        categories: [],
        toppingCategories: []
      };
    }

    // Preload menu categories and items
    const categories = await preloadMenuCategories(restaurantId);
    
    // Preload topping categories and toppings
    const toppingCategories = await preloadToppingCategories(restaurantId);

    console.log('✅ Preloading complete', {
      restaurant: restaurant.name,
      categoriesCount: categories.length,
      toppingCategoriesCount: toppingCategories.length
    });

    return {
      restaurant,
      categories,
      toppingCategories
    };
  } catch (error) {
    console.error('Error during data preloading:', error);
    return {
      restaurant: null,
      categories: [],
      toppingCategories: []
    };
  }
};

/**
 * Preloads restaurant data by slug
 */
export const preloadRestaurantBySlug = async (slug: string): Promise<Restaurant | null> => {
  try {
    // Check cache first
    const cachedRestaurant = getCacheItem<Restaurant>(CACHE_KEYS.RESTAURANT, slug, 'kiosk');
    if (cachedRestaurant) {
      return cachedRestaurant;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.error("Error fetching restaurant by slug:", error);
      return null;
    }

    // Cache result
    setCacheItem(CACHE_KEYS.RESTAURANT, data, slug, 'kiosk');
    return data;
  } catch (error) {
    console.error("Error preloading restaurant:", error);
    return null;
  }
};

/**
 * Preloads menu categories with their items
 */
export const preloadMenuCategories = async (restaurantId: string): Promise<(MenuCategory & { items: MenuItem[] })[]> => {
  try {
    // Check cache first
    const cachedCategories = getCacheItem<(MenuCategory & { items: MenuItem[] })[]>(
      CACHE_KEYS.CATEGORIES, 
      restaurantId,
      'kiosk'
    );
    
    if (cachedCategories) {
      return cachedCategories;
    }

    // Fetch categories from database
    const { data: categories, error } = await supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order('display_order', { ascending: true });

    if (error || !categories) {
      console.error("Error fetching menu categories:", error);
      return [];
    }

    // Fetch menu items for each category
    const categoriesWithItems = await Promise.all(
      categories.map(async (category) => {
        const { data: items, error: itemsError } = await supabase
          .from("menu_items")
          .select("*")
          .eq("category_id", category.id)
          .order('display_order', { ascending: true });

        if (itemsError || !items) {
          console.error(`Error fetching items for category ${category.id}:`, itemsError);
          return { ...category, items: [] };
        }

        // Cache individual items for quick access
        items.forEach(item => {
          setCacheItem(`${CACHE_KEYS.MENU_ITEM_PREFIX}${item.id}`, item, restaurantId, 'kiosk');
        });

        return { ...category, items };
      })
    );

    // Sort by display_order
    const sortedCategoriesWithItems = categoriesWithItems.sort((a, b) => {
      return (a.display_order || 0) - (b.display_order || 0);
    });

    // Cache the complete result
    setCacheItem(CACHE_KEYS.CATEGORIES, sortedCategoriesWithItems, restaurantId, 'kiosk');
    return sortedCategoriesWithItems;
  } catch (error) {
    console.error("Error preloading menu categories:", error);
    return [];
  }
};

/**
 * Preloads topping categories with their toppings
 */
export const preloadToppingCategories = async (restaurantId: string): Promise<(ToppingCategory & { toppings: Topping[] })[]> => {
  try {
    // Check cache first
    const cachedToppingCategories = getCacheItem<(ToppingCategory & { toppings: Topping[] })[]>(
      CACHE_KEYS.TOPPING_CATEGORIES, 
      restaurantId,
      'kiosk'
    );
    
    if (cachedToppingCategories) {
      return cachedToppingCategories;
    }

    // Fetch topping categories from database
    const { data: toppingCategories, error } = await supabase
      .from("topping_categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order('display_order', { ascending: true });

    if (error || !toppingCategories) {
      console.error("Error fetching topping categories:", error);
      return [];
    }

    // Fetch toppings for each category
    const toppingCategoriesWithToppings = await Promise.all(
      toppingCategories.map(async (category) => {
        const { data: toppings, error: toppingsError } = await supabase
          .from("toppings")
          .select("*")
          .eq("category_id", category.id)
          .order('display_order', { ascending: true });

        if (toppingsError || !toppings) {
          console.error(`Error fetching toppings for category ${category.id}:`, toppingsError);
          return { ...category, toppings: [] };
        }

        // Cache individual topping collections for quick access
        setCacheItem(`${CACHE_KEYS.TOPPINGS_PREFIX}${category.id}`, toppings, restaurantId, 'kiosk');

        return { ...category, toppings };
      })
    );

    // Sort by display_order
    const sortedToppingCategoriesWithToppings = toppingCategoriesWithToppings.sort((a, b) => {
      return (a.display_order || 0) - (b.display_order || 0);
    });

    // Cache the complete result
    setCacheItem(CACHE_KEYS.TOPPING_CATEGORIES, sortedToppingCategoriesWithToppings, restaurantId, 'kiosk');
    return sortedToppingCategoriesWithToppings;
  } catch (error) {
    console.error("Error preloading topping categories:", error);
    return [];
  }
};

/**
 * Refreshes all data for a specific restaurant
 * Used when data is updated and needs to be refreshed
 */
export const refreshRestaurantData = async (restaurantId: string, slug: string) => {
  console.log(`🔄 Refreshing data for restaurant: ${restaurantId}`);
  
  // Clear existing cache for this restaurant
  clearCache(restaurantId);
  
  // Preload data again
  return await preloadRestaurantData(restaurantId, slug);
};

/**
 * Utility to detect if we're in an admin/owner context and disable caching
 */
export const isAdminOrOwnerContext = (): boolean => {
  const path = window.location.pathname;
  return path.includes('/admin') || 
         path.includes('/owner') || 
         path === '/' || 
         path.includes('/restaurant/') ||
         path.includes('/restaurants');
};
