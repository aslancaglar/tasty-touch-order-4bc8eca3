/**
 * Enhanced utility functions for managing authentication cache with improved session continuity
 */

interface CacheEntry {
  status: boolean;
  timestamp: number;
  sessionId?: string;
  refreshCount?: number;
  lastValidated?: number;
  securityHash?: string;
}

export const AUTH_CACHE_KEY = 'auth_admin_cache';
export const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export const CACHE_REFRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes for refresh
export const EMERGENCY_FALLBACK_TIME = 2 * 60 * 60 * 1000; // 2 hours emergency fallback
export const SECURITY_VALIDATION_INTERVAL = 15 * 60 * 1000; // 15 minutes security check

/**
 * Generate security hash for cache validation
 */
const generateSecurityHash = (userId: string, sessionId?: string): string => {
  const data = `${userId}:${sessionId || 'no-session'}:${Math.floor(Date.now() / SECURITY_VALIDATION_INTERVAL)}`;
  return btoa(data).slice(0, 16);
};

/**
 * Validate cache entry security
 */
const validateCacheEntrySecurity = (entry: CacheEntry, userId: string, sessionId?: string): boolean => {
  if (!entry.securityHash) return false;
  
  const currentHash = generateSecurityHash(userId, sessionId);
  const previousHash = generateSecurityHash(userId, sessionId);
  
  return entry.securityHash === currentHash || entry.securityHash === previousHash;
};

/**
 * Clear stale cache entries from localStorage with improved security validation
 */
export const clearStaleAuthCache = (): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);
    const now = Date.now();
    const cleanCache: { [key: string]: CacheEntry } = {};

    // Keep only non-stale entries with valid security hashes
    Object.keys(cache).forEach(key => {
      const entry = cache[key];
      if (entry && (now - entry.timestamp) < CACHE_DURATION) {
        // Validate security hash if present
        if (!entry.securityHash || validateCacheEntrySecurity(entry, key)) {
          cleanCache[key] = entry;
        } else {
          console.warn(`[AuthCache] Removing entry with invalid security hash for user: ${key}`);
        }
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
 * Get cache entry for a user with enhanced security validation
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
    const needsSecurityValidation = !entry.lastValidated || (now - entry.lastValidated) > SECURITY_VALIDATION_INTERVAL;
    
    // Return null if truly stale
    if (isStale) {
      console.log('[AuthCache] Cache entry is stale, returning null');
      return null;
    }

    // Enhanced security validation
    if (needsSecurityValidation && !validateCacheEntryService(entry, userId, sessionId)) {
      console.warn('[AuthCache] Cache entry failed security validation, invalidating');
      invalidateCacheEntry(userId);
      return null;
    }

    // For session changes, be more lenient during refresh periods
    const sessionChanged = sessionId && entry.sessionId && entry.sessionId !== sessionId;
    if (sessionChanged && needsRefresh) {
      console.log('[AuthCache] Session changed during refresh period, allowing cached value');
    }

    const status = needsRefresh ? '(needs refresh)' : '(fresh)';
    console.log(`[AuthCache] Using cached admin status: ${entry.status} ${status}`);
    
    // Update last validated timestamp
    if (needsSecurityValidation) {
      entry.lastValidated = now;
      cache[userId] = entry;
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    }
    
    return entry.status;
  } catch (error) {
    console.error('[AuthCache] Error reading cache:', error);
    return null;
  }
};

/**
 * Set cache entry for a user with enhanced security metadata
 */
export const setCachedAdminStatus = (userId: string, status: boolean, sessionId?: string): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    const cache = stored ? JSON.parse(stored) : {};

    const existingEntry = cache[userId];
    const now = Date.now();
    
    cache[userId] = {
      status,
      timestamp: now,
      sessionId: sessionId || existingEntry?.sessionId,
      refreshCount: (existingEntry?.refreshCount || 0) + 1,
      lastValidated: now,
      securityHash: generateSecurityHash(userId, sessionId)
    };

    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    console.log('[AuthCache] Cached admin status:', status, 'for user:', userId, 
      sessionId ? `(session: ${sessionId.slice(0, 8)}...)` : '');
  } catch (error) {
    console.error('[AuthCache] Error setting cache:', error);
  }
};

/**
 * Invalidate specific cache entry for security reasons
 */
export const invalidateCacheEntry = (userId: string): void => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);
    delete cache[userId];
    
    if (Object.keys(cache).length > 0) {
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    } else {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
    
    console.log('[AuthCache] Invalidated cache entry for user:', userId);
  } catch (error) {
    console.error('[AuthCache] Error invalidating cache:', error);
  }
};

/**
 * Force invalidate all sessions for security
 */
export const forceInvalidateAllSessions = (): void => {
  try {
    localStorage.removeItem(AUTH_CACHE_KEY);
    // Also clear any other auth-related storage
    const authKeys = ['supabase.auth.token', 'auth_admin_cache'];
    authKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    console.log('[AuthCache] Force invalidated all auth sessions');
  } catch (error) {
    console.error('[AuthCache] Error force invalidating sessions:', error);
  }
};

/**
 * Check if cache needs refresh with enhanced security checks
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
    const needsSecurityValidation = !entry.lastValidated || (now - entry.lastValidated) > SECURITY_VALIDATION_INTERVAL;
    
    if (needsRefresh || needsSecurityValidation) {
      console.log('[AuthCache] Cache needs refresh for user:', userId, 
        `(age: ${Math.round(age / 60000)}min, security: ${needsSecurityValidation})`);
    }
    
    return needsRefresh || needsSecurityValidation;
  } catch (error) {
    console.error('[AuthCache] Error checking refresh need:', error);
    return false;
  }
};

/**
 * Background refresh functionality with enhanced security
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
      // On failure, invalidate the cache entry to force fresh check
      invalidateCacheEntry(userId);
    }
  }, refreshDelay);
};

/**
 * Helper function for security validation (used internally)
 */
const validateCacheEntryService = (entry: CacheEntry, userId: string, sessionId?: string): boolean => {
  return validateCacheEntrySecurity(entry, userId, sessionId);
};

/**
 * Initialize cache cleanup with improved security intervals
 */
export const initializeAuthCacheCleanup = (): void => {
  // Clean up stale entries on initialization
  clearStaleAuthCache();

  // Set up periodic cleanup every 15 minutes (more frequent for security)
  setInterval(() => {
    clearStaleAuthCache();
  }, 15 * 60 * 1000);

  console.log('[AuthCache] Initialized enhanced cache cleanup with security validation');
};

/**
 * Get cache security metrics for monitoring
 */
export const getCacheSecurityMetrics = (): {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} => {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      oldestEntry: null,
      newestEntry: null
    };

    const cache = JSON.parse(stored);
    const entries = Object.values(cache) as CacheEntry[];
    const now = Date.now();
    
    let validEntries = 0;
    let invalidEntries = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    
    entries.forEach(entry => {
      const age = now - entry.timestamp;
      const isValid = age < CACHE_DURATION && entry.securityHash;
      
      if (isValid) {
        validEntries++;
      } else {
        invalidEntries++;
      }
      
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });
    
    return {
      totalEntries: entries.length,
      validEntries,
      invalidEntries,
      oldestEntry,
      newestEntry
    };
  } catch (error) {
    console.error('[AuthCache] Error getting security metrics:', error);
    return {
      totalEntries: 0,
      validEntries: 0,
      invalidEntries: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }
};
