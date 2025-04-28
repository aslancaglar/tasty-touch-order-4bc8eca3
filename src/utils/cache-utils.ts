const CACHE_PREFIX = 'kiosk_cache_';
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export const getFromCache = <T>(key: string, restaurantId: string): T | null => {
  try {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) return null;
    
    const parsedData = JSON.parse(cachedData) as CacheEntry<T>;
    
    // Check if cache is expired
    if (Date.now() - parsedData.timestamp > CACHE_EXPIRY_TIME) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return parsedData.data;
  } catch (error) {
    console.error("Error retrieving from cache:", error);
    return null;
  }
};

export const saveToCache = <T>(key: string, restaurantId: string, data: T): void => {
  try {
    const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
  } catch (error) {
    console.error("Error saving to cache:", error);
  }
};

export const clearCache = (restaurantId: string | null = null): void => {
  try {
    // If restaurant ID is provided, clear only that restaurant's cache
    if (restaurantId) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${CACHE_PREFIX}${restaurantId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }
    
    // Otherwise clear all kiosk caches
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

export const getCacheStats = (restaurantId: string | null = null): { count: number, size: number } => {
  try {
    let totalSize = 0;
    let count = 0;
    
    const prefix = restaurantId ? `${CACHE_PREFIX}${restaurantId}_` : CACHE_PREFIX;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key) || '';
        totalSize += value.length * 2; // Approximate size in bytes (UTF-16 encoding)
        count++;
      }
    }
    
    return {
      count,
      size: Math.round(totalSize / 1024) // Size in KB
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return { count: 0, size: 0 };
  }
};
