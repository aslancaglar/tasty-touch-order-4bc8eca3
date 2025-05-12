
const CACHE_PREFIX = 'kiosk_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const debugCache = (action: string, key: string, hit?: boolean) => {
  console.log(`Cache ${action}: ${key}${hit !== undefined ? ` (Cache ${hit ? 'HIT' : 'MISS'})` : ''}`);
};

export const setCacheItem = <T>(key: string, data: T, restaurantId: string) => {
  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cacheData: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  debugCache('SET', cacheKey);
};

export const getCacheItem = <T>(key: string, restaurantId: string): T | null => {
  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) {
    debugCache('GET', cacheKey, false);
    return null;
  }
  
  const cacheData: CacheItem<T> = JSON.parse(cached);
  
  // Allow stale data to be returned, but mark it as stale in the logs
  const isStale = Date.now() - cacheData.timestamp > CACHE_DURATION;
  debugCache(isStale ? 'GET (STALE)' : 'GET', cacheKey, true);
  
  return cacheData.data;
};

export const getCacheTimestamp = (key: string, restaurantId: string): number | null => {
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
