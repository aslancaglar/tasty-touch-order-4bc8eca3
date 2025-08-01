import { setCacheItem, getCacheItem, clearCache, clearMenuCache, isCacheStale, isCacheNeedsRefresh } from './cache-service';
import { cleanupImageCache, getStorageEstimate } from '@/utils/image-cache';
import { clearAllAuthCache } from '@/utils/auth-cache-utils';
import { isOnline } from '@/utils/service-worker';

// Cache coordination types
interface CacheStrategy {
  priority: 'high' | 'medium' | 'low';
  ttl: number;
  maxSize?: number;
  invalidationRules?: string[];
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  memoryUsage: number;
  lastCleanup: Date;
  totalRequests: number;
  cacheHits: number;
}

class CacheCoordinator {
  private metrics: CacheMetrics;
  private strategies: Map<string, CacheStrategy>;
  private cleanupInterval: number | null = null;
  private backgroundRefreshQueue: Set<string> = new Set();

  constructor() {
    this.metrics = {
      hitRate: 0,
      missRate: 0,
      memoryUsage: 0,
      lastCleanup: new Date(),
      totalRequests: 0,
      cacheHits: 0
    };

    this.strategies = new Map([
      ['menu', { priority: 'high', ttl: 30 * 60 * 1000, invalidationRules: ['menu_update', 'item_update'] }],
      ['restaurant', { priority: 'high', ttl: 60 * 60 * 1000, invalidationRules: ['restaurant_update'] }],
      ['categories', { priority: 'high', ttl: 45 * 60 * 1000, invalidationRules: ['category_update', 'menu_update'] }],
      ['toppings', { priority: 'medium', ttl: 45 * 60 * 1000, invalidationRules: ['topping_update'] }],
      ['images', { priority: 'medium', ttl: 2 * 60 * 60 * 1000, maxSize: 50 * 1024 * 1024, invalidationRules: [] }],
      ['auth', { priority: 'high', ttl: 24 * 60 * 60 * 1000, invalidationRules: ['auth_update'] }]
    ]);

    this.initializeCleanupScheduler();
  }

  // Central cache access with strategy-aware logic
  async get<T>(key: string, restaurantId: string, isAdmin = false): Promise<T | null> {
    this.metrics.totalRequests++;
    
    const cached = getCacheItem<T>(key, restaurantId, isAdmin);
    if (cached) {
      this.metrics.cacheHits++;
      this.updateHitRate();
      
      // Schedule background refresh if needed
      if (isCacheNeedsRefresh(key, restaurantId)) {
        this.scheduleBackgroundRefresh(key, restaurantId);
      }
      
      return cached;
    }

    this.updateHitRate();
    return null;
  }

  async set<T>(key: string, data: T, restaurantId: string, isAdmin = false): Promise<void> {
    const strategy = this.getStrategyForKey(key);
    
    // Check memory constraints before setting
    if (strategy?.maxSize) {
      const estimate = await getStorageEstimate();
      if (estimate.used > strategy.maxSize) {
        await this.performMemoryOptimization();
      }
    }

    setCacheItem(key, data, restaurantId, isAdmin);
    await this.updateMemoryMetrics();
  }

  // Smart invalidation based on rules
  async invalidate(event: string, restaurantId: string, metadata?: any): Promise<void> {
    console.log(`[CacheCoordinator] Invalidating caches for event: ${event}`);
    
    for (const [cacheType, strategy] of this.strategies) {
      if (strategy.invalidationRules?.includes(event)) {
        switch (cacheType) {
          case 'menu':
            clearMenuCache(restaurantId);
            break;
          case 'auth':
            clearAllAuthCache();
            break;
          default:
            clearCache(restaurantId, cacheType);
        }
      }
    }

    // Clear specific items based on metadata
    if (metadata?.itemId) {
      clearCache(restaurantId, `menu_item_${metadata.itemId}`);
    }
    if (metadata?.categoryId) {
      clearCache(restaurantId, `category_${metadata.categoryId}`);
    }
  }

  // Memory optimization with intelligent cleanup
  async performMemoryOptimization(): Promise<void> {
    console.log('[CacheCoordinator] Starting memory optimization...');
    
    try {
      // 1. Clean expired entries first
      await this.cleanupExpiredEntries();
      
      // 2. Clean image cache
      cleanupImageCache();
      
      // 3. Clear low-priority caches if needed
      const estimate = await getStorageEstimate();
      const usagePercentage = (estimate.used / estimate.quota) * 100;
      
      if (usagePercentage > 80) {
        console.log('[CacheCoordinator] High memory usage, clearing low-priority caches');
        await this.clearLowPriorityCaches();
      }
      
      await this.updateMemoryMetrics();
      this.metrics.lastCleanup = new Date();
      
      console.log('[CacheCoordinator] Memory optimization complete');
    } catch (error) {
      console.error('[CacheCoordinator] Memory optimization failed:', error);
    }
  }

  // Background refresh management
  private scheduleBackgroundRefresh(key: string, restaurantId: string): void {
    const refreshKey = `${key}_${restaurantId}`;
    
    if (this.backgroundRefreshQueue.has(refreshKey) || !isOnline()) {
      return;
    }

    this.backgroundRefreshQueue.add(refreshKey);
    
    // Defer refresh to avoid blocking current operation
    setTimeout(() => {
      this.processBackgroundRefresh(key, restaurantId);
    }, 100);
  }

  private async processBackgroundRefresh(key: string, restaurantId: string): Promise<void> {
    const refreshKey = `${key}_${restaurantId}`;
    
    try {
      // This would trigger a refresh in the actual data layer
      console.log(`[CacheCoordinator] Background refresh for ${key}`);
      
      // Remove from queue after processing
      this.backgroundRefreshQueue.delete(refreshKey);
    } catch (error) {
      console.error(`[CacheCoordinator] Background refresh failed for ${key}:`, error);
      this.backgroundRefreshQueue.delete(refreshKey);
    }
  }

  // Metrics and monitoring
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  async getDiagnostics() {
    const storage = await getStorageEstimate();
    const onlineStatus = isOnline();
    
    return {
      metrics: this.metrics,
      storage: {
        used: Math.round(storage.used / 1024 / 1024), // MB
        quota: Math.round(storage.quota / 1024 / 1024), // MB
        usagePercentage: Math.round((storage.used / storage.quota) * 100)
      },
      backgroundQueue: this.backgroundRefreshQueue.size,
      onlineStatus,
      strategies: Object.fromEntries(this.strategies)
    };
  }

  // Cleanup and maintenance
  private initializeCleanupScheduler(): void {
    // Run cleanup every 10 minutes
    this.cleanupInterval = window.setInterval(() => {
      this.performMemoryOptimization();
    }, 10 * 60 * 1000);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    for (const key of keys) {
      if (key.startsWith('cache_') || key.startsWith('image_cache_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.timestamp && now - item.timestamp > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(key);
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    }
  }

  private async clearLowPriorityCaches(): Promise<void> {
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (key.includes('_low_') || key.includes('_temp_')) {
        localStorage.removeItem(key);
      }
    }
  }

  private getStrategyForKey(key: string): CacheStrategy | undefined {
    for (const [type, strategy] of this.strategies) {
      if (key.includes(type)) {
        return strategy;
      }
    }
    return this.strategies.get('default');
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;
    this.metrics.missRate = 100 - this.metrics.hitRate;
  }

  private async updateMemoryMetrics(): Promise<void> {
    const estimate = await getStorageEstimate();
    this.metrics.memoryUsage = estimate.used;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.backgroundRefreshQueue.clear();
  }
}

// Export singleton instance
export const cacheCoordinator = new CacheCoordinator();

// Export utilities for external use
export const getCachedData = <T>(key: string, restaurantId: string, isAdmin = false) =>
  cacheCoordinator.get<T>(key, restaurantId, isAdmin);

export const setCachedData = <T>(key: string, data: T, restaurantId: string, isAdmin = false) =>
  cacheCoordinator.set(key, data, restaurantId, isAdmin);

export const invalidateCache = (event: string, restaurantId: string, metadata?: any) =>
  cacheCoordinator.invalidate(event, restaurantId, metadata);

export const getCacheMetrics = () => cacheCoordinator.getMetrics();

export const getCacheDiagnostics = () => cacheCoordinator.getDiagnostics();