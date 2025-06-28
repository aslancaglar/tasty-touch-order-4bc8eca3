/**
 * Utility functions for managing authentication cache
 */

interface CacheEntry {
  status: boolean;
  timestamp: number;
  sessionId?: string;
}

export const AUTH_CACHE_KEY = 'auth_admin_cache';
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear stale cache entries from localStorage
 */
export const clearStaleAuthCache = (): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);
    const now = Date.now();
    const cleanCache: { [key: string]: CacheEntry } = {};

    // Keep only non-stale entries
    Object.keys(cache).forEach(key => {
      const entry = cache[key];
      if (entry && (now - entry.timestamp) < CACHE_DURATION) {
        cleanCache[key] = entry;
      }
    });

    // Update localStorage with cleaned cache
    if (Object.keys(cleanCache).length > 0) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cleanCache));
      console.log(`[AuthCache] Cleaned cache, kept ${Object.keys(cleanCache).length} entries`);
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
      console.log('[AuthCache] Removed empty cache');
    }
  } catch (error) {
    console.error('[AuthCache] Error cleaning cache:', error);
    localStorage.removeItem(AUTH_CACHE_KEY);
  }
};

/**
 * Get cache entry for a user
 */
export const getCachedAdminStatus = (userId: string, sessionId?: string): boolean | null => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return null;

    const cache = JSON.parse(stored);
    const entry: CacheEntry = cache[userId];
    
    if (!entry) return null;

    const now = Date.now();
    const isStale = (now - entry.timestamp) > CACHE_DURATION;
    const sessionChanged = sessionId && entry.sessionId !== sessionId;

    if (isStale || sessionChanged) {
      console.log('[AuthCache] Cache entry is stale or session changed');
      return null;
    }

    console.log('[AuthCache] Using cached admin status:', entry.status);
    return entry.status;
  } catch (error) {
    console.error('[AuthCache] Error reading cache:', error);
    return null;
  }
};

/**
 * Set cache entry for a user
 */
export const setCachedAdminStatus = (userId: string, status: boolean, sessionId?: string): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    const cache = stored ? JSON.parse(stored) : {};

    cache[userId] = {
      status,
      timestamp: Date.now(),
      sessionId
    };

    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    console.log('[AuthCache] Cached admin status:', status, 'for user:', userId);
  } catch (error) {
    console.error('[AuthCache] Error setting cache:', error);
  }
};

/**
 * Clear all auth cache
 */
export const clearAllAuthCache = (): void => {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
    console.log('[AuthCache] Cleared all auth cache');
  } catch (error) {
    console.error('[AuthCache] Error clearing cache:', error);
  }
};

/**
 * Initialize cache cleanup on app start
 */
export const initializeAuthCacheCleanup = (): void => {
  // Clean up stale entries on initialization
  clearStaleAuthCache();

  // Set up periodic cleanup every 10 minutes
  setInterval(() => {
    clearStaleAuthCache();
  }, 10 * 60 * 1000);

  console.log('[AuthCache] Initialized cache cleanup');
};
