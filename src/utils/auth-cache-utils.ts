
/**
 * Enhanced utility functions for managing authentication cache with improved session continuity
 */

interface CacheEntry {
  status: boolean;
  timestamp: number;
  sessionId?: string;
}

export const AUTH_CACHE_KEY = 'auth_admin_cache';
export const CACHE_DURATION = 10 * 60 * 1000; // Increased to 10 minutes for better continuity
export const CACHE_REFRESH_THRESHOLD = 2 * 60 * 1000; // 2 minutes for refresh

/**
 * Clear stale cache entries from localStorage with improved logic
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
 * Get cache entry for a user with more lenient session checking
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
    const isOld = (now - entry.timestamp) > CACHE_REFRESH_THRESHOLD;
    
    // Allow slightly stale cache during token refresh for continuity
    if (isStale) {
      console.log('[AuthCache] Cache entry is stale, returning null');
      return null;
    }

    // For token refresh scenarios, be more lenient about session changes
    const sessionChanged = sessionId && entry.sessionId && entry.sessionId !== sessionId;
    if (sessionChanged && !isOld) {
      console.log('[AuthCache] Session changed but cache is recent, allowing it');
    }

    console.log('[AuthCache] Using cached admin status:', entry.status, 
      isOld ? '(needs refresh soon)' : '(fresh)');
    return entry.status;
  } catch (error) {
    console.error('[AuthCache] Error reading cache:', error);
    return null;
  }
};

/**
 * Set cache entry for a user with enhanced metadata
 */
export const setCachedAdminStatus = (userId: string, status: boolean, sessionId?: string): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    const cache = stored ? JSON.parse(stored) : {};

    cache[userId] = {
      status,
      timestamp: Date.now(),
      sessionId: sessionId || cache[userId]?.sessionId // Preserve sessionId if not provided
    };

    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    console.log('[AuthCache] Cached admin status:', status, 'for user:', userId, 
      sessionId ? `(session: ${sessionId.slice(0, 8)}...)` : '');
  } catch (error) {
    console.error('[AuthCache] Error setting cache:', error);
  }
};

/**
 * Check if cache needs refresh (for proactive updates)
 */
export const shouldRefreshCache = (userId: string): boolean => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return false;

    const cache = JSON.parse(stored);
    const entry: CacheEntry = cache[userId];
    
    if (!entry) return false;

    const now = Date.now();
    const needsRefresh = (now - entry.timestamp) > CACHE_REFRESH_THRESHOLD;
    
    if (needsRefresh) {
      console.log('[AuthCache] Cache needs refresh for user:', userId);
    }
    
    return needsRefresh;
  } catch (error) {
    console.error('[AuthCache] Error checking refresh need:', error);
    return false;
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
 * Initialize cache cleanup with improved intervals
 */
export const initializeAuthCacheCleanup = (): void => {
  // Clean up stale entries on initialization
  clearStaleAuthCache();

  // Set up periodic cleanup every 5 minutes (more frequent)
  setInterval(() => {
    clearStaleAuthCache();
  }, 5 * 60 * 1000);

  console.log('[AuthCache] Initialized enhanced cache cleanup');
};
