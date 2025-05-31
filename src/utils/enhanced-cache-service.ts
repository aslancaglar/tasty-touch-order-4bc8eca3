
import { getCacheItem, setCacheItem, clearMenuCache } from "@/services/cache-service";

export interface CacheHealthStatus {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  cacheSize: number;
  itemCount: number;
}

/**
 * Enhanced cache service with health monitoring and recovery
 */
export class EnhancedCacheService {
  /**
   * Check cache health and integrity
   */
  static checkCacheHealth(): CacheHealthStatus {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let cacheSize = 0;
    let itemCount = 0;

    try {
      // Check localStorage availability
      if (typeof Storage === 'undefined') {
        issues.push('LocalStorage not available');
        return { isHealthy: false, issues, recommendations, cacheSize, itemCount };
      }

      // Calculate cache size and count items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kiosk_cache_')) {
          itemCount++;
          const value = localStorage.getItem(key);
          if (value) {
            cacheSize += value.length;
          }
        }
      }

      // Check for corruption
      let corruptedItems = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kiosk_cache_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              JSON.parse(value);
            }
          } catch (e) {
            corruptedItems++;
            issues.push(`Corrupted cache item: ${key}`);
          }
        }
      }

      // Size warnings
      const sizeMB = cacheSize / (1024 * 1024);
      if (sizeMB > 10) {
        issues.push(`Cache size is large: ${sizeMB.toFixed(2)}MB`);
        recommendations.push('Consider clearing old cache data');
      }

      // Corruption warnings
      if (corruptedItems > 0) {
        issues.push(`${corruptedItems} corrupted cache items found`);
        recommendations.push('Clear corrupted cache items');
      }

      // Storage space check
      try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
      } catch (e) {
        issues.push('LocalStorage quota exceeded or unavailable');
        recommendations.push('Clear cache to free up space');
      }

    } catch (error) {
      issues.push(`Cache health check failed: ${error}`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations,
      cacheSize,
      itemCount
    };
  }

  /**
   * Repair cache by removing corrupted items
   */
  static repairCache(): { repaired: boolean; removedItems: string[] } {
    const removedItems: string[] = [];

    try {
      const keysToRemove: string[] = [];
      
      // Find corrupted items
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kiosk_cache_')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              JSON.parse(value);
            }
          } catch (e) {
            keysToRemove.push(key);
          }
        }
      }

      // Remove corrupted items
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        removedItems.push(key);
      });

      return { repaired: true, removedItems };
    } catch (error) {
      console.error('Cache repair failed:', error);
      return { repaired: false, removedItems };
    }
  }

  /**
   * Smart cache refresh with fallback strategies
   */
  static async smartCacheRefresh(restaurantId: string, forceRefresh: boolean = false): Promise<boolean> {
    try {
      console.log(`[EnhancedCache] Starting smart cache refresh for restaurant ${restaurantId}`);

      // Check cache health first
      const health = this.checkCacheHealth();
      if (!health.isHealthy) {
        console.warn('[EnhancedCache] Cache health issues detected:', health.issues);
        this.repairCache();
      }

      // Clear specific restaurant cache if force refresh
      if (forceRefresh) {
        clearMenuCache(restaurantId);
        console.log(`[EnhancedCache] Force cleared cache for restaurant ${restaurantId}`);
      }

      return true;
    } catch (error) {
      console.error('[EnhancedCache] Smart cache refresh failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { totalSize: number; itemCount: number; healthScore: number } {
    const health = this.checkCacheHealth();
    const healthScore = health.isHealthy ? 100 : Math.max(0, 100 - (health.issues.length * 20));

    return {
      totalSize: health.cacheSize,
      itemCount: health.itemCount,
      healthScore
    };
  }
}
