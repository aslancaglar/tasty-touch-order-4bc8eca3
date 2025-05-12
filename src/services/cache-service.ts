
const CACHE_PREFIX = 'kiosk_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Improved debug log to provide more information
const debugCache = (action: string, key: string, hit?: boolean, size?: number) => {
  const sizeText = size ? ` (${(size / 1024).toFixed(2)}KB)` : '';
  console.log(`Cache ${action}: ${key}${hit !== undefined ? ` (Cache ${hit ? 'HIT' : 'MISS'})` : ''}${sizeText}`);
};

// In-memory LRU cache to reduce localStorage access
const memoryCache = new Map<string, CacheItem<any>>();
const MEMORY_CACHE_MAX_SIZE = 100; // Limit the number of items in memory cache

/**
 * Sets an item in both memory and localStorage cache
 */
export const setCacheItem = <T>(key: string, data: T, restaurantId: string) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
    const cacheData: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    
    // Store in memory cache first
    memoryCache.set(cacheKey, cacheData);
    
    // Limit memory cache size
    if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
      const oldestKey = memoryCache.keys().next().value;
      memoryCache.delete(oldestKey);
    }
    
    // Store in localStorage
    try {
      const serialized = JSON.stringify(cacheData);
      localStorage.setItem(cacheKey, serialized);
      debugCache('SET', cacheKey, undefined, serialized.length);
    } catch (storageError) {
      console.error(`Failed to store in localStorage (possibly quota exceeded): ${cacheKey}`, storageError);
      // Continue with only memory cache if localStorage fails
    }
  } catch (error) {
    console.error(`Error in setCacheItem for ${key}:`, error);
  }
};

/**
 * Gets an item from cache, checking memory cache first
 */
export const getCacheItem = <T>(key: string, restaurantId: string): T | null => {
  try {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
    
    // Try memory cache first (faster)
    if (memoryCache.has(cacheKey)) {
      const cacheData = memoryCache.get(cacheKey) as CacheItem<T>;
      
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
        // Expired from memory too
        memoryCache.delete(cacheKey);
        debugCache('EXPIRED', cacheKey);
        return null;
      }
      
      debugCache('GET (memory)', cacheKey, true);
      return cacheData.data;
    }
    
    // Fall back to localStorage
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      debugCache('GET', cacheKey, false);
      return null;
    }
    
    const cacheData: CacheItem<T> = JSON.parse(cached);
    
    if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
      localStorage.removeItem(cacheKey);
      debugCache('EXPIRED', cacheKey);
      return null;
    }
    
    // Add back to memory cache for faster future access
    memoryCache.set(cacheKey, cacheData);
    
    debugCache('GET (storage)', cacheKey, true);
    return cacheData.data;
  } catch (error) {
    console.error(`Error in getCacheItem for ${key}:`, error);
    return null;
  }
};

/**
 * Clears cache entries for a restaurant
 */
export const clearCache = (restaurantId: string, specificKey?: string) => {
  try {
    if (specificKey) {
      const cacheKey = `${CACHE_PREFIX}${restaurantId}_${specificKey}`;
      localStorage.removeItem(cacheKey);
      memoryCache.delete(cacheKey);
      debugCache('CLEAR', cacheKey);
      return;
    }
    
    // Clear memory cache for this restaurant
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${CACHE_PREFIX}${restaurantId}`)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear localStorage
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
  } catch (error) {
    console.error(`Error in clearCache for ${restaurantId}:`, error);
  }
};

// Add preloading functionality for batch access
export const preloadCacheItem = <T>(key: string, restaurantId: string, fetcher: () => Promise<T>): Promise<T | null> => {
  try {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
    
    // Check if already in memory cache
    if (memoryCache.has(cacheKey)) {
      const cacheData = memoryCache.get(cacheKey) as CacheItem<T>;
      
      if (Date.now() - cacheData.timestamp <= CACHE_DURATION) {
        debugCache('PRELOAD (memory hit)', key, true);
        return Promise.resolve(cacheData.data);
      }
      memoryCache.delete(cacheKey);
    }
    
    // Check localStorage
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const cacheData: CacheItem<T> = JSON.parse(cached);
        
        if (Date.now() - cacheData.timestamp <= CACHE_DURATION) {
          // Also add to memory cache
          memoryCache.set(cacheKey, cacheData);
          debugCache('PRELOAD (storage hit)', key, true);
          return Promise.resolve(cacheData.data);
        }
        
        localStorage.removeItem(cacheKey);
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }
    
    // Not in cache, need to fetch
    debugCache('PRELOAD (miss)', key, false);
    return fetcher().then(data => {
      if (data) {
        setCacheItem(key, data, restaurantId);
      }
      return data;
    });
  } catch (error) {
    console.error(`Error in preloadCacheItem for ${key}:`, error);
    return fetcher(); // Fallback to direct fetch
  }
};
