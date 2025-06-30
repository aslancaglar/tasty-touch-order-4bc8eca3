
/**
 * Enhanced utility functions for managing authentication cache with improved session continuity
 */

interface CacheEntry {
  status: boolean;
  timestamp: number;
  sessionId?: string;
  refreshCount?: number;
}

export const AUTH_CACHE_KEY = 'auth_admin_cache';
export const CACHE_DURATION = 24 * 60 * 60 * 1000; // Extended to 24 hours
export const CACHE_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes for refresh
export const EMERGENCY_FALLBACK_TIME = 2 * 60 * 60 * 1000; // 2 hours emergency fallback

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
 * Get cache entry for a user with graceful degradation
 */
export const getCachedAdminStatus = (userId: string, sessionId?: string): boolean | null => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return null;

    const cache = JSON.parse(stored);
    const entry: CacheEntry = cache[userId];
    
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;
    const isStale = age > CACHE_DURATION;
    const needsRefresh = age > CACHE_REFRESH_THRESHOLD;
    const isEmergencyFallback = age > EMERGENCY_FALLBACK_TIME;
    
    // Emergency fallback: if cache is very old but not stale, allow it
    if (isEmergencyFallback && !isStale) {
      console.log('[AuthCache] Using emergency fallback cache (very old but valid)');
      return entry.status;
    }

    // Return null if truly stale
    if (isStale) {
      console.log('[AuthCache] Cache entry is stale, returning null');
      return null;
    }

    // For session changes, be more lenient during refresh periods
    const sessionChanged = sessionId && entry.sessionId && entry.sessionId !== sessionId;
    if (sessionChanged && needsRefresh) {
      console.log('[AuthCache] Session changed during refresh period, allowing cached value');
    }

    const status = needsRefresh ? '(needs refresh)' : '(fresh)';
    console.log(`[AuthCache] Using cached admin status: ${entry.status} ${status}`);
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

    const existingEntry = cache[userId];
    cache[userId] = {
      status,
      timestamp: Date.now(),
      sessionId: sessionId || existingEntry?.sessionId,
      refreshCount: (existingEntry?.refreshCount || 0) + 1
    };

    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    console.log('[AuthCache] Cached admin status:', status, 'for user:', userId, 
      sessionId ? `(session: ${sessionId.slice(0, 8)}...)` : '');
  } catch (error) {
    console.error('[AuthCache] Error setting cache:', error);
  }
};

/**
 * Check if cache needs refresh with progressive logic
 */
export const shouldRefreshCache = (userId: string): boolean => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return false;

    const cache = JSON.parse(stored);
    const entry: CacheEntry = cache[userId];
    
    if (!entry) return false;

    const now = Date.now();
    const age = now - entry.timestamp;
    const needsRefresh = age > CACHE_REFRESH_THRESHOLD;
    
    if (needsRefresh) {
      console.log('[AuthCache] Cache needs refresh for user:', userId, `(age: ${Math.round(age / 60000)}min)`);
    }
    
    return needsRefresh;
  } catch (error) {
    console.error('[AuthCache] Error checking refresh need:', error);
    return false;
  }
};

/**
 * Background refresh functionality
 */
export const scheduleBackgroundRefresh = (userId: string, refreshFn: () => Promise<void>): void => {
  if (!shouldRefreshCache(userId)) return;

  // Schedule background refresh with exponential backoff
  const refreshDelay = Math.min(5000 + Math.random() * 5000, 30000); // 5-10s, max 30s
  
  setTimeout(async () => {
    try {
      console.log('[AuthCache] Performing background refresh for user:', userId);
      await refreshFn();
    } catch (error) {
      console.warn('[AuthCache] Background refresh failed:', error);
    }
  }, refreshDelay);
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

  // Set up periodic cleanup every 30 minutes (less frequent due to longer cache)
  setInterval(() => {
    clearStaleAuthCache();
  }, 30 * 60 * 1000);

  console.log('[AuthCache] Initialized enhanced cache cleanup with 24h duration');
};
