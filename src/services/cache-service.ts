
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

// New function to check if a cached item is stale
export const isCacheStale = <T>(key: string, restaurantId: string, maxAge?: number): boolean => {
  const cacheKey = `${CACHE_PREFIX}${restaurantId}_${key}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (!cached) {
    return true; // If no cache, it's stale
  }
  
  try {
    const cacheData: CacheItem<T> = JSON.parse(cached);
    const age = Date.now() - cacheData.timestamp;
    const maxAgeToUse = maxAge || CACHE_DURATION;
    
    return age > maxAgeToUse;
  } catch (e) {
    // If there's an error parsing, consider it stale
    return true;
  }
};

// Restaurant-specific data types that might need refreshing
type DataType = 'menu' | 'categories' | 'toppings' | 'settings' | 'restaurant' | 'all';

// Function to generate API URLs for different data types
const getApiUrlsForDataType = (dataType: DataType, restaurantId: string): string[] => {
  const baseUrl = 'https://yifimiqeybttmbhuplaq.supabase.co/rest/v1/';
  const urls: string[] = [];
  
  switch (dataType) {
    case 'menu':
      urls.push(`${baseUrl}menu_items?restaurant_id=eq.${restaurantId}`);
      break;
    case 'categories':
      urls.push(`${baseUrl}categories?restaurant_id=eq.${restaurantId}`);
      break;
    case 'toppings':
      urls.push(`${baseUrl}toppings?restaurant_id=eq.${restaurantId}`);
      urls.push(`${baseUrl}topping_categories?restaurant_id=eq.${restaurantId}`);
      break;
    case 'settings':
      urls.push(`${baseUrl}restaurant_settings?restaurant_id=eq.${restaurantId}`);
      break;
    case 'restaurant':
      urls.push(`${baseUrl}restaurants?id=eq.${restaurantId}`);
      break;
    case 'all':
      // Combine all URLs
      return [
        ...getApiUrlsForDataType('menu', restaurantId),
        ...getApiUrlsForDataType('categories', restaurantId),
        ...getApiUrlsForDataType('toppings', restaurantId),
        ...getApiUrlsForDataType('settings', restaurantId),
        ...getApiUrlsForDataType('restaurant', restaurantId),
      ];
  }
  
  return urls;
};

// New function to refresh specific data types for a restaurant
import { forceRefreshCache } from '../utils/service-worker';

export const refreshRestaurantData = async (
  restaurantId: string, 
  dataType: DataType = 'all'
): Promise<boolean> => {
  const urls = getApiUrlsForDataType(dataType, restaurantId);
  
  if (urls.length === 0) {
    console.warn(`No URLs found for data type: ${dataType}`);
    return false;
  }
  
  try {
    return await forceRefreshCache(urls);
  } catch (error) {
    console.error(`Error refreshing ${dataType} data:`, error);
    return false;
  }
};
