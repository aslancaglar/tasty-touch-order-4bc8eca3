
const CACHE_PREFIX = 'kiosk_cache_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const setCacheItem = <T>(key: string, data: T, restaurantId: string) => {
  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cacheData: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(cacheKey, JSON.stringify(cacheData));
};

export const getCacheItem = <T>(key: string, restaurantId: string): T | null => {
  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) return null;
  
  const cacheData: CacheItem<T> = JSON.parse(cached);
  
  if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
    localStorage.removeItem(cacheKey);
    return null;
  }
  
  return cacheData.data;
};

export const clearCache = (restaurantId: string) => {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}${restaurantId}`)) {
      localStorage.removeItem(key);
    }
  }
};
