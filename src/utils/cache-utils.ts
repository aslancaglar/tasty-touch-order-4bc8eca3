
const CACHE_PREFIX = 'restaurant_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

export interface CacheMetadata {
  timestamp: number;
  expiresAt: number;
}

export interface CachedData<T> extends CacheMetadata {
  data: T;
}

export const cacheKeys = {
  menuItems: (restaurantId: string) => `${CACHE_PREFIX}${restaurantId}_menu_items`,
  toppings: (restaurantId: string) => `${CACHE_PREFIX}${restaurantId}_toppings`,
  categories: (restaurantId: string) => `${CACHE_PREFIX}${restaurantId}_categories`,
};

export const setCache = <T>(key: string, data: T): void => {
  const cacheData: CachedData<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_EXPIRY,
  };
  localStorage.setItem(key, JSON.stringify(cacheData));
};

export const getCache = <T>(key: string): T | null => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const parsedCache: CachedData<T> = JSON.parse(cached);
  if (Date.now() > parsedCache.expiresAt) {
    localStorage.removeItem(key);
    return null;
  }

  return parsedCache.data;
};

export const clearRestaurantCache = (restaurantId: string): void => {
  Object.values(cacheKeys).forEach(getKey => {
    localStorage.removeItem(getKey(restaurantId));
  });
};

export const clearAllCache = (): void => {
  Object.keys(localStorage)
    .filter(key => key.startsWith(CACHE_PREFIX))
    .forEach(key => localStorage.removeItem(key));
};
