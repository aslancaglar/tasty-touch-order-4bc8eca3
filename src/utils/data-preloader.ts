
import { 
  getRestaurantBySlug, 
  getMenuForRestaurant,
  getMenuItemWithOptions,
  getToppingsForRestaurant
} from "@/services/kiosk-service";
import { 
  setCacheItem, 
  getCacheItem,
  isCacheStale,
  clearMenuCache,
  forceFlushMenuCache
} from "@/services/cache-service";
import { cacheImage, precacheImages } from "@/utils/image-cache";
import { MenuCategory, MenuItem, Restaurant } from "@/types/database-types";

// Types for preloader state
export interface PreloaderState {
  isLoading: boolean;
  progress: number;
  stage: PreloadStage;
  error: Error | null;
  restaurantData?: Restaurant | null;
}

export type PreloadStage = 
  | 'idle'
  | 'restaurant'
  | 'menu'
  | 'menuItems'
  | 'toppings'
  | 'images'
  | 'complete'
  | 'error';

export interface PreloadOptions {
  forceRefresh?: boolean;
  skipImages?: boolean;
}

// Status callbacks
export type ProgressCallback = (state: PreloaderState) => void;

// Main preloader function
export const preloadAllRestaurantData = async (
  restaurantSlug: string,
  options: PreloadOptions = {},
  onProgress?: ProgressCallback
): Promise<Restaurant | null> => {
  const initialState: PreloaderState = {
    isLoading: true,
    progress: 0,
    stage: 'idle',
    error: null
  };
  
  let currentState = { ...initialState };
  const updateProgress = (updates: Partial<PreloaderState>) => {
    currentState = { ...currentState, ...updates };
    onProgress?.(currentState);
  };

  try {
    // Step 1: Load restaurant data
    updateProgress({ stage: 'restaurant', progress: 5 });
    
    // If forceRefresh is true, clear all menu-related cache first
    if (options.forceRefresh) {
      console.log("[Preloader] Force refresh requested, clearing existing cache...");
      const cachedRestaurant = getCacheItem<Restaurant>(`restaurant_${restaurantSlug}`, 'global');
      if (cachedRestaurant) {
        console.log(`[Preloader] Force flushing menu cache for restaurant ${cachedRestaurant.id}`);
        forceFlushMenuCache(cachedRestaurant.id);
      }
    }
    
    // Check if we have cached restaurant data and it's not stale or forceRefresh is true
    const cachedRestaurant = options.forceRefresh 
      ? null 
      : getCacheItem<Restaurant>(`restaurant_${restaurantSlug}`, 'global');
    
    let restaurant: Restaurant | null = null;
    
    // Always fetch fresh restaurant data when forceRefresh is true
    if (options.forceRefresh || !cachedRestaurant) {
      console.log("[Preloader] Fetching fresh restaurant data");
      restaurant = await getRestaurantBySlug(restaurantSlug);
    } else {
      console.log("[Preloader] Using cached restaurant data");
      restaurant = cachedRestaurant;
    }
    
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${restaurantSlug}`);
    }

    // Cache restaurant data
    setCacheItem(`restaurant_${restaurantSlug}`, restaurant, 'global');
    updateProgress({ 
      restaurantData: restaurant, 
      progress: 15, 
      stage: 'menu' 
    });

    // Step 2: Load all menu categories and items
    const menuCacheKey = `categories_${restaurant.id}`;
    // Consider cache stale if forceRefresh is true
    const shouldRefreshMenu = options.forceRefresh || isCacheStale(menuCacheKey, restaurant.id);
    
    let menuCategories: (MenuCategory & { items: MenuItem[] })[];
    
    if (!shouldRefreshMenu) {
      menuCategories = getCacheItem<(MenuCategory & { items: MenuItem[] })[]>(menuCacheKey, restaurant.id) || [];
      if (menuCategories.length > 0) {
        console.log("[Preloader] Using cached menu categories");
      } else {
        console.log("[Preloader] Empty cached menu categories, will fetch fresh data");
      }
    } else {
      // Clear existing menu cache if we're refreshing
      if (options.forceRefresh) {
        console.log("[Preloader] Force refresh - ensuring menu cache is cleared");
        clearMenuCache(restaurant.id);
      }
    }
    
    // Always fetch fresh menu data if forceRefresh is true or no cached menu exists
    if (options.forceRefresh || !menuCategories || menuCategories.length === 0) {
      console.log("[Preloader] Fetching fresh menu categories");
      menuCategories = await getMenuForRestaurant(restaurant.id);
      
      // Sort by display order
      menuCategories.sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
      
      // Also sort items within each category
      menuCategories.forEach(category => {
        category.items = [...category.items].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
      });
      
      // Cache the new menu categories
      console.log(`[Preloader] Caching ${menuCategories.length} menu categories`);
      setCacheItem(menuCacheKey, menuCategories, restaurant.id);
    }

    updateProgress({ progress: 30, stage: 'menuItems' });

    // Step 3: Preload all menu item details (options, choices)
    const totalItems = menuCategories.reduce((sum, category) => sum + category.items.length, 0);
    let processedItems = 0;
    
    const menuItemsPromises = menuCategories.flatMap(category => 
      category.items.map(async (item) => {
        const itemCacheKey = `menuItem_${item.id}`;
        // Always fetch item details when forceRefresh is true
        const shouldFetchItem = options.forceRefresh || isCacheStale(itemCacheKey, restaurant.id);
        
        if (!shouldFetchItem) {
          const cachedItem = getCacheItem(itemCacheKey, restaurant.id);
          if (cachedItem) {
            processedItems++;
            const itemProgress = 30 + (processedItems / totalItems) * 20;
            updateProgress({ progress: Math.min(50, itemProgress) });
            return cachedItem;
          }
        }
        
        console.log(`[Preloader] Fetching item details for ${item.name} (${item.id})`);
        const itemDetails = await getMenuItemWithOptions(item.id);
        if (itemDetails) {
          setCacheItem(itemCacheKey, itemDetails, restaurant.id);
        }
        
        processedItems++;
        const itemProgress = 30 + (processedItems / totalItems) * 20;
        updateProgress({ progress: Math.min(50, itemProgress) });
        
        return itemDetails;
      })
    );
    
    // Wait for all item details to be fetched and cached
    await Promise.all(menuItemsPromises);
    updateProgress({ progress: 50, stage: 'toppings' });

    // Step 4: Cache topping categories and toppings
    const toppingsCacheKey = `toppings_${restaurant.id}`;
    const shouldRefreshToppings = options.forceRefresh || isCacheStale(toppingsCacheKey, restaurant.id);
    
    if (shouldRefreshToppings) {
      console.log("[Preloader] Fetching fresh toppings data");
      const toppingsData = await getToppingsForRestaurant(restaurant.id);
      setCacheItem(toppingsCacheKey, toppingsData, restaurant.id);
    }
    
    updateProgress({ progress: 60, stage: 'images' });

    // Step 5: Preload images if not skipped
    if (!options.skipImages) {
      // Collect all image URLs that need to be cached
      const imageUrls: string[] = [];
      
      // Restaurant image
      if (restaurant.image_url) {
        imageUrls.push(restaurant.image_url);
      }
      
      // Menu item images
      menuCategories.forEach(category => {
        category.items.forEach(item => {
          if (item.image) {
            imageUrls.push(item.image);
          }
        });
      });
      
      // Filter out empty or invalid URLs
      const validImageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.length > 0);
      
      // Preload images in batches to avoid overwhelming the browser
      if (validImageUrls.length > 0) {
        updateProgress({ progress: 65 });
        await precacheImages(validImageUrls);
      }
    }
    
    // All data loaded and cached successfully
    updateProgress({ isLoading: false, progress: 100, stage: 'complete' });
    console.log("[Preloader] Preloading completed successfully");
    return restaurant;
    
  } catch (error) {
    console.error("[Preloader] Error preloading data:", error);
    updateProgress({ 
      isLoading: false, 
      progress: 0, 
      stage: 'error', 
      error: error instanceof Error ? error : new Error('Unknown error during preloading') 
    });
    throw error;
  }
};

// Helper function to clear all cached data for a restaurant
export const clearRestaurantCache = (restaurantId: string): void => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(restaurantId)) {
        localStorage.removeItem(key);
      }
    }
    console.log(`Cleared all cached data for restaurant: ${restaurantId}`);
  } catch (error) {
    console.error("Error clearing restaurant cache:", error);
  }
};
