
import { isCachingEnabled, getCacheDuration } from './cache-config';

const CACHE_PREFIX = 'kiosk_cache_';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const debugCache = (action: string, key: string, hit?: boolean, context?: string) => {
  console.log(`Cache ${action}: ${key}${hit !== undefined ? ` (Cache ${hit ? 'HIT' : 'MISS'})` : ''} ${context ? `[${context}]` : ''}`);
};

export const setCacheItem = <T>(key: string, data: T, restaurantId: string, context?: 'kiosk' | 'admin' | 'owner') => {
  // Skip caching if disabled for this context
  if (!isCachingEnabled(context)) {
    debugCache('SKIP', key, undefined, `Context: ${context || 'unknown'} - Caching disabled`);
    return;
  }

  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cacheData: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  debugCache('SET', cacheKey, undefined, context);
};

export const getCacheItem = <T>(key: string, restaurantId: string, context?: 'kiosk' | 'admin' | 'owner'): T | null => {
  // Skip cache lookup if disabled for this context
  if (!isCachingEnabled(context)) {
    debugCache('SKIP', key, undefined, `Context: ${context || 'unknown'} - Caching disabled`);
    return null;
  }

  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) {
    debugCache('GET', cacheKey, false, context);
    return null;
  }
  
  try {
    const cacheData: CacheItem<T> = JSON.parse(cached);
    
    if (Date.now() - cacheData.timestamp > getCacheDuration()) {
      localStorage.removeItem(cacheKey);
      debugCache('EXPIRED', cacheKey, undefined, context);
      return null;
    }
    
    debugCache('GET', cacheKey, true, context);
    return cacheData.data;
  } catch (error) {
    console.error('Error parsing cached data:', error);
    localStorage.removeItem(cacheKey);
    debugCache('ERROR', cacheKey, undefined, context);
    return null;
  }
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

/**
 * Clear all cache entries for a specific data type across all restaurants
 * Used when making global changes that affect multiple restaurants
 */
export const clearCacheByType = (keyPattern: string) => {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(keyPattern)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    debugCache('CLEAR_TYPE', key);
  });
  
  console.log(`Cleared ${keysToRemove.length} cache entries matching pattern: ${keyPattern}`);
};

/**
 * Get all restaurant IDs that have cached data
 */
export const getCachedRestaurantIds = (): string[] => {
  const restaurantIds = new Set<string>();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      // Extract restaurant ID from key format: kiosk_cache_RESTAURANT_ID_data_key
      const parts = key.substring(CACHE_PREFIX.length).split('_');
      if (parts.length >= 1) {
        restaurantIds.add(parts[0]);
      }
    }
  }
  
  return Array.from(restaurantIds);
};
