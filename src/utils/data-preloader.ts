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
  forceFlushMenuCache,
  isCachingEnabled
} from "@/services/cache-service";
import { cacheImage, precacheImages } from "@/utils/image-cache";
import { MenuCategory, MenuItem, Restaurant } from "@/types/database-types";
import { isOnline, retryNetworkRequest } from "@/utils/service-worker";
import { handleCacheError } from "@/utils/cache-config";

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
  isAdmin?: boolean; // New option to indicate admin context
}

// Status callbacks
export type ProgressCallback = (state: PreloaderState) => void;

// Tracking refresh attempts to prevent too many in a short time
const refreshAttempts = {
  count: 0,
  lastRefreshTime: 0,
  maxAttemptsPerMinute: 5,
};

// Helper to check if we should throttle refresh attempts
const shouldThrottleRefresh = (): boolean => {
  const now = Date.now();
  const oneMinute = 60 * 1000;
  
  // Reset counter if it's been more than a minute since last attempt
  if (now - refreshAttempts.lastRefreshTime > oneMinute) {
    refreshAttempts.count = 0;
    refreshAttempts.lastRefreshTime = now;
    return false;
  }
  
  // Increment counter
  refreshAttempts.count++;
  
  // Check if we've exceeded the limit
  if (refreshAttempts.count > refreshAttempts.maxAttemptsPerMinute) {
    console.warn(`[Preloader] Too many refresh attempts (${refreshAttempts.count}). Throttling.`);
    return true;
  }
  
  return false;
};

// Export the simple functions that KioskView expects
export const getRestaurantData = async (restaurantSlug: string) => {
  const restaurant = await getRestaurantBySlug(restaurantSlug);
  if (!restaurant) {
    throw new Error(`Restaurant not found: ${restaurantSlug}`);
  }

  const categories = await getMenuForRestaurant(restaurant.id);
  const menuItems = categories.flatMap(category => category.items);

  return {
    restaurant,
    categories,
    menuItems
  };
};

export const preloadImages = async (imageUrls: string[], onProgress?: (progress: number) => void) => {
  return precacheImages(imageUrls);
};

// Main preloader function - REVISED to fetch first, then clear cache only on success
export const preloadAllRestaurantData = async (
  restaurantSlug: string,
  options: PreloadOptions = {},
  onProgress?: ProgressCallback
): Promise<Restaurant | null> => {
  // Check for throttling
  if (shouldThrottleRefresh() && options.forceRefresh) {
    throw new Error("Too many refresh attempts in a short period. Please wait a moment and try again.");
  }
  
  const isAdmin = options.isAdmin || false;
  
  // Skip caching completely if:
  // 1. It's an admin request and admin caching is disabled
  // 2. Caching is completely disabled
  if (isAdmin && !isCachingEnabled(true)) {
    console.log("[Preloader] Admin detected and admin caching disabled, skipping cache operations");
    
    try {
      // Just fetch the restaurant directly without caching
      console.log("[Preloader] Fetching fresh restaurant data for admin context");
      const restaurant = await getRestaurantBySlug(restaurantSlug);
      return restaurant;
    } catch (error) {
      console.error("[Preloader] Error fetching restaurant data for admin:", error);
      throw error;
    }
  }

  // Check if we're online before attempting a force refresh
  if (options.forceRefresh && !isOnline()) {
    throw new Error("Cannot refresh data while offline. Please check your internet connection and try again.");
  }

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
    
    // Check if we have cached restaurant data
    const cachedRestaurant = getCacheItem<Restaurant>(`restaurant_${restaurantSlug}`, 'global', isAdmin);
    
    let restaurant: Restaurant | null = null;
    
    // Always fetch fresh restaurant data when forceRefresh is true
    if (options.forceRefresh || !cachedRestaurant) {
      console.log("[Preloader] Fetching fresh restaurant data");
      try {
        restaurant = await retryNetworkRequest(
          () => getRestaurantBySlug(restaurantSlug),
          3,
          500
        );
      } catch (error) {
        // If we have cached data, use it even if fetch fails
        if (cachedRestaurant) {
          console.warn("[Preloader] Failed to fetch fresh restaurant data, using cached data");
          restaurant = cachedRestaurant;
        } else {
          throw error;
        }
      }
    } else {
      console.log("[Preloader] Using cached restaurant data");
      restaurant = cachedRestaurant;
    }
    
    if (!restaurant) {
      throw new Error(`Restaurant not found: ${restaurantSlug}`);
    }

    // Only cache restaurant data if we fetched it successfully
    if (options.forceRefresh) {
      setCacheItem(`restaurant_${restaurantSlug}`, restaurant, 'global', isAdmin);
    }
    
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
      menuCategories = getCacheItem<(MenuCategory & { items: MenuItem[] })[]>(menuCacheKey, restaurant.id, isAdmin) || [];
      if (menuCategories.length > 0) {
        console.log("[Preloader] Using cached menu categories");
      } else {
        console.log("[Preloader] Empty cached menu categories, will fetch fresh data");
      }
    }
    
    // Fetch fresh menu data if needed
    let fetchedFreshMenu = false;
    if (options.forceRefresh || !menuCategories || menuCategories.length === 0) {
      try {
        console.log("[Preloader] Fetching fresh menu categories");
        menuCategories = await retryNetworkRequest(
          () => getMenuForRestaurant(restaurant.id),
          3,
          500
        );
        fetchedFreshMenu = true;
        
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
        
        // Cache the new menu categories ONLY if successfully fetched
        console.log(`[Preloader] Caching ${menuCategories.length} menu categories`);
        setCacheItem(menuCacheKey, menuCategories, restaurant.id, isAdmin);
      } catch (error) {
        // If we have cached data, use it
        const cachedMenu = getCacheItem<(MenuCategory & { items: MenuItem[] })[]>(menuCacheKey, restaurant.id, isAdmin);
        if (cachedMenu && cachedMenu.length > 0) {
          console.warn("[Preloader] Failed to fetch fresh menu data, using cached menu");
          menuCategories = cachedMenu;
        } else {
          // No cached menu available
          console.error("[Preloader] Failed to fetch menu and no cache available:", error);
          throw error;
        }
      }
    }

    updateProgress({ progress: 30, stage: 'menuItems' });

    // Step 3: Preload all menu item details (options, choices)
    const totalItems = menuCategories.reduce((sum, category) => sum + category.items.length, 0);
    let processedItems = 0;
    
    try {
      const menuItemsPromises = menuCategories.flatMap(category => 
        category.items.map(async (item) => {
          const itemCacheKey = `menuItem_${item.id}`;
          // Always fetch item details when forceRefresh is true
          const shouldFetchItem = options.forceRefresh || isCacheStale(itemCacheKey, restaurant.id);
          
          if (!shouldFetchItem) {
            const cachedItem = getCacheItem(itemCacheKey, restaurant.id, isAdmin);
            if (cachedItem) {
              processedItems++;
              const itemProgress = 30 + (processedItems / totalItems) * 20;
              updateProgress({ progress: Math.min(50, itemProgress) });
              return cachedItem;
            }
          }
          
          try {
            console.log(`[Preloader] Fetching item details for ${item.name} (${item.id})`);
            const itemDetails = await getMenuItemWithOptions(item.id);
            if (itemDetails) {
              setCacheItem(itemCacheKey, itemDetails, restaurant.id, isAdmin);
            }
            
            processedItems++;
            const itemProgress = 30 + (processedItems / totalItems) * 20;
            updateProgress({ progress: Math.min(50, itemProgress) });
            
            return itemDetails;
          } catch (error) {
            // If we can't fetch this item's details, continue with others
            console.warn(`[Preloader] Failed to fetch details for item ${item.id}, continuing with others`);
            processedItems++;
            return null;
          }
        })
      );
      
      // Wait for all item details to be fetched and cached
      await Promise.allSettled(menuItemsPromises);
    } catch (error) {
      console.warn("[Preloader] Some menu items failed to load, continuing with what we have");
    }
    
    updateProgress({ progress: 50, stage: 'toppings' });

    // Step 4: Cache topping categories and toppings
    const toppingsCacheKey = `toppings_${restaurant.id}`;
    const shouldRefreshToppings = options.forceRefresh || isCacheStale(toppingsCacheKey, restaurant.id);
    
    if (shouldRefreshToppings) {
      try {
        console.log("[Preloader] Fetching fresh toppings data");
        const toppingsData = await retryNetworkRequest(
          () => getToppingsForRestaurant(restaurant.id),
          3,
          500
        );
        setCacheItem(toppingsCacheKey, toppingsData, restaurant.id, isAdmin);
      } catch (error) {
        console.warn("[Preloader] Failed to fetch toppings data, continuing with cached data if available");
      }
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
        try {
          await precacheImages(validImageUrls);
        } catch (error) {
          console.warn("[Preloader] Some images failed to preload, continuing");
        }
      }
    }
    
    // If we've successfully reached here AND we were doing a forceRefresh,
    // NOW is the time to clear old cache - AFTER we've successfully loaded new data
    if (options.forceRefresh && fetchedFreshMenu) {
      console.log("[Preloader] Successfully loaded fresh data, now safe to clear old cache");
      clearMenuCache(restaurant.id);
    }
    
    // All data loaded and cached successfully
    updateProgress({ isLoading: false, progress: 100, stage: 'complete' });
    console.log("[Preloader] Preloading completed successfully");
    return restaurant;
    
  } catch (error) {
    console.error("[Preloader] Error preloading data:", error);
    
    // Generate a user-friendly error message
    const errorMessage = handleCacheError("refresh menu data", error);
    
    updateProgress({ 
      isLoading: false, 
      progress: 0, 
      stage: 'error', 
      error: error instanceof Error ? error : new Error(errorMessage) 
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
