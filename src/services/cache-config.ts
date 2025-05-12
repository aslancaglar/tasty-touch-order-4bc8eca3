
/**
 * Cache configuration service to control caching behavior across the application
 */

// Default cache configuration
let cacheConfig = {
  enableCaching: true,        // Master switch for caching
  enableForKiosk: true,       // Enable caching for kiosk views
  enableForAdmin: false,      // Disable caching for admin dashboard
  enableForOwner: false,      // Disable caching for restaurant owner dashboard
  preloadOnKioskInit: true,   // Preload data when kiosk view initializes
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours default cache duration
};

/**
 * Initialize the cache configuration with default or provided settings
 */
export const initializeCacheConfig = (config: Partial<typeof cacheConfig> = {}) => {
  cacheConfig = {
    ...cacheConfig,
    ...config
  };
  
  console.log('Cache configuration initialized:', cacheConfig);
};

/**
 * Check if caching is enabled based on the current context
 */
export const isCachingEnabled = (context?: 'kiosk' | 'admin' | 'owner'): boolean => {
  // If master switch is off, caching is disabled for all contexts
  if (!cacheConfig.enableCaching) return false;
  
  // If no specific context is provided, return the master switch value
  if (!context) return cacheConfig.enableCaching;
  
  // Return based on context-specific configuration
  switch (context) {
    case 'kiosk':
      return cacheConfig.enableForKiosk;
    case 'admin':
      return cacheConfig.enableForAdmin;
    case 'owner':
      return cacheConfig.enableForOwner;
    default:
      return cacheConfig.enableCaching;
  }
};

/**
 * Get the cache duration in milliseconds
 */
export const getCacheDuration = (): number => {
  return cacheConfig.cacheDuration;
};

/**
 * Check if preloading is enabled for kiosk initialization
 */
export const shouldPreloadOnKioskInit = (): boolean => {
  return cacheConfig.enableForKiosk && cacheConfig.preloadOnKioskInit;
};

/**
 * Update specific cache configuration options
 */
export const updateCacheConfig = (config: Partial<typeof cacheConfig>) => {
  cacheConfig = {
    ...cacheConfig,
    ...config
  };
  
  console.log('Cache configuration updated:', cacheConfig);
};
