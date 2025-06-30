const CACHE_PREFIX = 'kiosk_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Extended to 24 hours to match auth cache
const CACHE_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes - extended threshold for refresh

interface CacheItem<T> {
  data: T;
  timestamp: number;
  refreshCount?: number;
}

// Enhanced cache configuration
const CACHE_CONFIG = {
  // Enable caching only for kiosk/customer views
  enableCaching: true,
  // Disable caching for admin/owner views
  enableCachingForAdmin: false,
  // Log cache operations
  debugLogs: true,
  // Enable background refresh
  enableBackgroundRefresh: true
};

const debugCache = (action: string, key: string, hit?: boolean, age?: number) => {
  if (!CACHE_CONFIG.debugLogs) return;
  const ageStr = age ? ` (age: ${Math.round(age / 60000)}min)` : '';
  console.log(`Cache ${action}: ${key}${hit !== undefined ? ` (Cache ${hit ? 'HIT' : 'MISS'})` : ''}${ageStr}`);
};

// Modified to support isAdmin flag with enhanced logic
export const setCacheItem = <T>(key: string, data: T, restaurantId: string, isAdmin = false) => {
  // Skip caching for admin routes if disabled
  if (isAdmin && !CACHE_CONFIG.enableCachingForAdmin) {
    console.log(`[CacheService] Admin detected, skipping cache SET for: ${key}`);
    return;
  }
  if (!CACHE_CONFIG.enableCaching) {
    console.log(`[CacheService] Caching disabled, skipping cache SET for: ${key}`);
    return;
  }

  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const existingCache = getCacheItem(key, restaurantId, isAdmin);
  const existingEntry = existingCache ? JSON.parse(localStorage.getItem(cacheKey) || '{}') : null;
  
  const cacheData: CacheItem<T> = {
    data,
    timestamp: Date.now(),
    refreshCount: (existingEntry?.refreshCount || 0) + 1
  };
  
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  debugCache('SET', cacheKey);
};

// Modified to support isAdmin flag with graceful degradation
export const getCacheItem = <T>(key: string, restaurantId: string, isAdmin = false): T | null => {
  // Skip cache lookup for admin routes if disabled
  if (isAdmin && !CACHE_CONFIG.enableCachingForAdmin) {
    console.log(`[CacheService] Admin detected, skipping cache GET for: ${key}`);
    return null;
  }
  if (!CACHE_CONFIG.enableCaching) {
    console.log(`[CacheService] Caching disabled, skipping cache GET for: ${key}`);
    return null;
  }

  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) {
    debugCache('GET', cacheKey, false);
    return null;
  }
  
  const cacheData: CacheItem<T> = JSON.parse(cached);
  const age = Date.now() - cacheData.timestamp;
  
  // Allow stale data to be returned for better user experience
  const isStale = age > CACHE_DURATION;
  const needsRefresh = age > CACHE_REFRESH_THRESHOLD;
  
  if (isStale) {
    debugCache('GET (STALE)', cacheKey, false, age);
    return null;
  }
  
  const status = needsRefresh ? 'NEEDS_REFRESH' : 'FRESH';
  debugCache(`GET (${status})`, cacheKey, true, age);
  
  // Schedule background refresh if needed
  if (needsRefresh && CACHE_CONFIG.enableBackgroundRefresh) {
    scheduleBackgroundRefresh(key, restaurantId, cacheData.data);
  }
  
  return cacheData.data;
};

// Background refresh functionality
const scheduleBackgroundRefresh = <T>(key: string, restaurantId: string, currentData: T) => {
  const refreshDelay = Math.min(5000 + Math.random() * 5000, 30000); // 5-10s, max 30s
  
  setTimeout(() => {
    console.log(`[CacheService] Background refresh scheduled for: ${key}`);
    // The actual refresh would be handled by the calling code
  }, refreshDelay);
};

export const getCacheTimestamp = (key: string, restaurantId: string): number | null => {
  if (!CACHE_CONFIG.enableCaching) return null;

  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  const cacheData: CacheItem<unknown> = JSON.parse(cached);
  return cacheData.timestamp;
};

export const isCacheStale = (key: string, restaurantId: string): boolean => {
  const timestamp = getCacheTimestamp(key, restaurantId);
  if (!timestamp) return true;
  
  return Date.now() - timestamp > CACHE_DURATION;
};

// Enhanced function to check if cache needs refresh
export const isCacheNeedsRefresh = (key: string, restaurantId: string): boolean => {
  const timestamp = getCacheTimestamp(key, restaurantId);
  if (!timestamp) return true;
  
  // Use extended threshold for refresh checks
  return Date.now() - timestamp > CACHE_REFRESH_THRESHOLD;
};

export const clearCache = (restaurantId: string, specificKey?: string) => {
  if (specificKey) {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${specificKey}`;
    localStorage.removeItem(cacheKey);
    debugCache('CLEAR', cacheKey);
    return;
  }
  
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${CACHE_PREFIX}${restaurantId}`)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    debugCache('CLEAR', key);
  });
};

// Enhanced function to clear menu data cache for a restaurant
export const clearMenuCache = (restaurantId: string): void => {
  console.log(`[CacheService] Clearing complete menu cache for restaurant: ${restaurantId}`);
  
  // Clear categories and menu items cache
  clearCache(restaurantId, `categories_${restaurantId}`);
  
  // Track all cleared items for debugging
  const keysToRemove: string[] = [];
  
  // Search through all localStorage items
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(`${CACHE_PREFIX}${restaurantId}`)) {
      // Clear ALL menu-related caches (expanded patterns)
      if (key.includes('menuItem_') || 
          key.includes('categories_') || 
          key.includes('toppings_') ||
          key.includes('options_') ||
          key.includes('choices_') ||
          key.includes('menu_') ||
          key.includes('print_config_')) { // Add print_config_ to clear print-related cache
        keysToRemove.push(key);
      }
    }
  }
  
  // Force remove all cached items immediately to ensure clean slate
  keysToRemove.forEach(key => {
    console.log(`[CacheService] Clearing cache key: ${key}`);
    localStorage.removeItem(key);
    debugCache('CLEAR (MENU)', key);
  });
  
  console.log(`[CacheService] Cleared menu cache for restaurant: ${restaurantId} (${keysToRemove.length} items)`);
};

// New function to clear all cached data for a specific cache type across all restaurants
export const clearCacheByType = (cacheType: string): void => {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(cacheType)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    debugCache('CLEAR (TYPE)', key);
  });
  
  console.log(`Cleared ${keysToRemove.length} cache items of type: ${cacheType}`);
};

// New function to get last update time for restaurant data
export const getLastUpdateTime = (restaurantId: string): Date | null => {
  let latestTimestamp = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${CACHE_PREFIX}${restaurantId}`)) {
      const timestamp = getCacheTimestamp(key.replace(`${CACHE_PREFIX}${restaurantId}_`, ''), restaurantId);
      if (timestamp && timestamp > latestTimestamp) {
        latestTimestamp = timestamp;
      }
    }
  }
  
  return latestTimestamp > 0 ? new Date(latestTimestamp) : null;
};

// Improved function to force flush all restaurant-related cache immediately
// Modified to be safer by making a copy before deleting
export const forceFlushMenuCache = (restaurantId: string): void => {
  console.log(`[CacheService] FORCE FLUSHING all menu cache for restaurant: ${restaurantId}`);
  
  // First collect all keys to delete (to avoid issues with changing localStorage during iteration)
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(`${CACHE_PREFIX}${restaurantId}`)) {
      keysToDelete.push(key);
    }
  }
  
  // Now delete them one by one
  keysToDelete.forEach(key => {
    console.log(`[CacheService] Force removing: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log(`[CacheService] Force flush complete for restaurant: ${restaurantId} (${keysToDelete.length} items)`);
};

// Add a new function to toggle caching on/off
export const setCachingEnabled = (enabled: boolean): void => {
  CACHE_CONFIG.enableCaching = enabled;
  console.log(`[CacheService] Caching is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
};

// Add a new function to toggle admin caching on/off
export const setCachingEnabledForAdmin = (enabled: boolean): void => {
  CACHE_CONFIG.enableCachingForAdmin = enabled;
  console.log(`[CacheService] Admin caching is now ${enabled ? 'ENABLED' : 'DISABLED'}`);
};

// Add a function to check if caching is enabled
export const isCachingEnabled = (isAdmin = false): boolean => {
  const enabled = isAdmin ? CACHE_CONFIG.enableCachingForAdmin : CACHE_CONFIG.enableCaching;
  if (isAdmin) {
    console.log(`[CacheService] Admin caching is ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }
  return enabled;
};
