
import { Restaurant } from "@/types/database-types";
import { getCacheItem } from "@/services/cache-service";

export interface RestaurantDebugInfo {
  slug: string;
  cacheStatus: {
    hasRestaurantCache: boolean;
    hasCategoriesCache: boolean;
    cacheAge?: number;
    cacheTimestamp?: number;
  };
  databaseStatus: {
    lastQueryTime?: number;
    lastError?: any;
  };
  networkStatus: {
    isOnline: boolean;
    connectionType?: string;
  };
  url: {
    current: string;
    parsed: {
      pathname: string;
      search: string;
      hash: string;
    };
  };
}

/**
 * Collect comprehensive debug information for restaurant loading issues
 */
export const collectRestaurantDebugInfo = (slug: string): RestaurantDebugInfo => {
  // Check cache status
  const cachedRestaurant = getCacheItem<Restaurant>(`restaurant_${slug}`, 'global');
  const restaurantId = cachedRestaurant?.id;
  const cachedCategories = restaurantId ? getCacheItem(`categories_${restaurantId}`, restaurantId) : null;

  // Get cache timestamp if available
  const cacheKey = `kiosk_cache_global_restaurant_${slug}`;
  const cacheData = localStorage.getItem(cacheKey);
  let cacheTimestamp: number | undefined;
  let cacheAge: number | undefined;

  if (cacheData) {
    try {
      const parsed = JSON.parse(cacheData);
      cacheTimestamp = parsed.timestamp;
      cacheAge = cacheTimestamp ? Date.now() - cacheTimestamp : undefined;
    } catch (e) {
      console.warn('Failed to parse cache data:', e);
    }
  }

  // Get network status
  const connection = (navigator as any).connection;

  return {
    slug,
    cacheStatus: {
      hasRestaurantCache: !!cachedRestaurant,
      hasCategoriesCache: !!cachedCategories,
      cacheAge,
      cacheTimestamp
    },
    databaseStatus: {
      lastQueryTime: undefined, // Will be set by actual query attempts
      lastError: undefined
    },
    networkStatus: {
      isOnline: navigator.onLine,
      connectionType: connection?.effectiveType || connection?.type || 'unknown'
    },
    url: {
      current: window.location.href,
      parsed: {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      }
    }
  };
};

/**
 * Log debug information in a structured format
 */
export const logRestaurantDebugInfo = (debugInfo: RestaurantDebugInfo, context?: string) => {
  console.group(`[RestaurantDebug] ${context || 'Debug Info'} - ${debugInfo.slug}`);
  
  console.log('🏪 Restaurant Slug:', debugInfo.slug);
  console.log('💾 Cache Status:', debugInfo.cacheStatus);
  console.log('🗄️  Database Status:', debugInfo.databaseStatus);
  console.log('🌐 Network Status:', debugInfo.networkStatus);
  console.log('🔗 URL Info:', debugInfo.url);
  
  if (debugInfo.cacheStatus.cacheAge) {
    const ageInMinutes = Math.round(debugInfo.cacheStatus.cacheAge / (1000 * 60));
    console.log(`⏰ Cache Age: ${ageInMinutes} minutes`);
  }
  
  console.groupEnd();
  
  return debugInfo;
};

/**
 * Validate restaurant data integrity
 */
export const validateRestaurantData = (restaurant: Restaurant | null): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!restaurant) {
    issues.push('Restaurant object is null or undefined');
    return { isValid: false, issues };
  }

  // Check required fields
  if (!restaurant.id) issues.push('Missing restaurant ID');
  if (!restaurant.name || restaurant.name.trim() === '') issues.push('Missing or empty restaurant name');
  if (!restaurant.slug || restaurant.slug.trim() === '') issues.push('Missing or empty restaurant slug');

  // Check data types
  if (typeof restaurant.name !== 'string') issues.push('Restaurant name is not a string');
  if (typeof restaurant.slug !== 'string') issues.push('Restaurant slug is not a string');

  // Check for suspicious values
  if (restaurant.slug.includes(' ')) issues.push('Restaurant slug contains spaces');
  if (restaurant.slug.length < 2) issues.push('Restaurant slug is too short');

  return {
    isValid: issues.length === 0,
    issues
  };
};
