
/**
 * Enhanced utility functions for managing authentication cache with improved session continuity
 * Now uses secure storage and logging for better security
 */

import { SECURITY_CONFIG } from '@/config/security';
import { secureStorage } from './secure-storage';
import { secureWarn, secureInfo, secureDebug } from './secure-logger';

interface CacheEntry {
  isAdmin: boolean;
  timestamp: number;
  sessionId?: string;
  refreshCount?: number;
}

type AuthCacheEntry = Record<string, CacheEntry>;

const AUTH_CACHE_KEY = 'admin_status_cache';

/**
 * Clear stale cache entries with improved logic
 */
export const clearStaleAuthCache = async (): Promise<void> => {
  try {
    const cache = await secureStorage.getItem<AuthCacheEntry>(AUTH_CACHE_KEY);
    if (!cache) return;

    const now = Date.now();
    const cleanCache: AuthCacheEntry = {};

    // Keep only non-stale entries
    for (const [userId, entry] of Object.entries(cache)) {
      if (entry && typeof entry === 'object' && 'timestamp' in entry) {
        const age = now - entry.timestamp;
        
        if (age < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE) {
          cleanCache[userId] = entry;
        }
      }
    }

    if (Object.keys(cleanCache).length > 0) {
      await secureStorage.setItem(AUTH_CACHE_KEY, cleanCache, true);
      secureDebug(`Cleaned cache, kept ${Object.keys(cleanCache).length} entries`, undefined, 'AuthCache');
    } else {
      secureStorage.removeItem(AUTH_CACHE_KEY);
      secureDebug('Removed empty cache', undefined, 'AuthCache');
    }
  } catch (error) {
    secureWarn('Error cleaning cache', error, 'AuthCache');
    secureStorage.removeItem(AUTH_CACHE_KEY);
  }
};

/**
 * Get cache entry for a user with graceful degradation
 * Compatibility wrapper for existing code
 */
export const getCachedAdminStatus = (userId: string, sessionId?: string): boolean | null => {
  // Synchronous wrapper for compatibility
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return null;
    
    const cache = JSON.parse(stored);
    const entry = cache[userId];
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE) return null;
    
    return entry.isAdmin;
  } catch {
    return null;
  }
};

export const getCachedAdminStatusAsync = async (userId: string): Promise<{ isAdmin: boolean; isFresh: boolean } | null> => {
  try {
    const cache = await secureStorage.getItem<AuthCacheEntry>(AUTH_CACHE_KEY);
    if (!cache) return null;

    const entry = cache[userId];
    
    if (!entry || typeof entry !== 'object' || !('isAdmin' in entry) || !('timestamp' in entry)) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    
    // Check if cache is expired
    if (age > SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE) {
      return null;
    }

    // Cache is fresh if less than 1 minute old
    const isFresh = age < 60000;
    
    secureDebug(`Using cached admin status: ${entry.isAdmin} ${isFresh ? '(fresh)' : '(needs refresh)'}`, undefined, 'AuthCache');
    
    return {
      isAdmin: entry.isAdmin,
      isFresh
    };
  } catch (error) {
    secureWarn('Error reading cache', error, 'AuthCache');
    return null;
  }
};

/**
 * Set cache entry for a user with enhanced metadata
 */
export const setCachedAdminStatus = (userId: string, isAdmin: boolean, sessionId?: string): void => {
  // Synchronous wrapper for compatibility
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    const cache = stored ? JSON.parse(stored) : {};
    
    cache[userId] = {
      isAdmin,
      timestamp: Date.now(),
      sessionId
    };
    
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    secureWarn('Error setting cache', error, 'AuthCache');
  }
};

export const setCachedAdminStatusSecure = async (userId: string, isAdmin: boolean): Promise<void> => {
  try {
    const cache = await secureStorage.getItem<AuthCacheEntry>(AUTH_CACHE_KEY) || {};
    
    cache[userId] = {
      isAdmin,
      timestamp: Date.now()
    };
    
    await secureStorage.setItem(AUTH_CACHE_KEY, cache, true);
    secureInfo('Admin status cached', { isAdmin }, 'AuthCache');
  } catch (error) {
    secureWarn('Error setting cache', error, 'AuthCache');
  }
};

/**
 * Check if cache needs refresh with progressive logic
 */
export const isCacheEntryValid = async (userId: string): Promise<boolean> => {
  try {
    const cache = await secureStorage.getItem<AuthCacheEntry>(AUTH_CACHE_KEY);
    if (!cache) return false;

    const entry = cache[userId];
    
    if (!entry || typeof entry !== 'object' || !('timestamp' in entry)) {
      return false;
    }

    const age = Date.now() - entry.timestamp;
    return age < SECURITY_CONFIG.SESSION.ADMIN_CHECK_CACHE;
  } catch (error) {
    return false;
  }
};

/**
 * Clear all auth cache
 */
export const clearAuthCache = (): void => {
  try {
    secureStorage.removeItem(AUTH_CACHE_KEY);
    secureInfo('Auth cache cleared', undefined, 'AuthCache');
  } catch (error) {
    secureWarn('Error clearing cache', error, 'AuthCache');
  }
};

// Compatibility exports for existing code
export const initializeAuthCacheCleanup = (): void => {
  clearStaleAuthCache();
};

export const scheduleBackgroundRefresh = (userId: string, refreshFn: () => Promise<void>): void => {
  // Simplified background refresh
  setTimeout(async () => {
    try {
      await refreshFn();
    } catch (error) {
      secureWarn('Background refresh failed', error, 'AuthCache');
    }
  }, 5000);
};
