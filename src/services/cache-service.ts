
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
  
  if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
    localStorage.removeItem(cacheKey);
    debugCache('EXPIRED', cacheKey);
    return null;
  }
  
  debugCache('GET', cacheKey, true);
  return cacheData.data;
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

