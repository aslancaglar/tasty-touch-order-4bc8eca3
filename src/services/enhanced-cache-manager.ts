import { cacheCoordinator } from '@/services/cache-coordinator';
import { clearMenuCache, clearCacheByType, isCachingEnabled } from '@/services/cache-service';
import { startupPreloader } from '@/services/startup-preloader';

interface CacheHealthMetrics {
  totalSize: number;
  hitRate: number;
  missRate: number;
  stalePercentage: number;
  redundantEntries: number;
  memoryPressure: 'low' | 'medium' | 'high';
}

interface OptimizationResult {
  clearedEntries: number;
  freedBytes: number;
  optimizations: string[];
}

class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private optimizationInProgress = false;
  private lastOptimization = 0;
  private readonly OPTIMIZATION_COOLDOWN = 30000; // 30 seconds

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  private constructor() {
    this.setupPeriodicOptimization();
  }

  private setupPeriodicOptimization(): void {
    // Run optimization every 5 minutes in production, 2 minutes in development
    const interval = import.meta.env.DEV ? 120000 : 300000;
    
    setInterval(async () => {
      if (this.shouldRunOptimization()) {
        await this.performSmartOptimization();
      }
    }, interval);
  }

  private shouldRunOptimization(): boolean {
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimization;
    
    return !this.optimizationInProgress && 
           timeSinceLastOptimization > this.OPTIMIZATION_COOLDOWN &&
           isCachingEnabled();
  }

  async getCacheHealth(): Promise<CacheHealthMetrics> {
    const metrics = cacheCoordinator.getMetrics();
    const diagnostics = await cacheCoordinator.getDiagnostics();
    
    // Calculate memory pressure based on storage usage
    const memoryPressure = this.calculateMemoryPressure(diagnostics.storage);
    
    // Detect redundant entries (simplified detection)
    const redundantEntries = this.detectRedundantEntries();
    
    return {
      totalSize: diagnostics.storage.used,
      hitRate: metrics.hitRate,
      missRate: metrics.missRate,
      stalePercentage: this.calculateStalePercentage(),
      redundantEntries,
      memoryPressure
    };
  }

  private calculateMemoryPressure(storage: any): 'low' | 'medium' | 'high' {
    const usagePercentage = (storage.used / storage.quota) * 100;
    
    if (usagePercentage > 85) return 'high';
    if (usagePercentage > 60) return 'medium';
    return 'low';
  }

  private detectRedundantEntries(): number {
    // Check for duplicate topping/category cache entries
    const storage = localStorage;
    const keys = Object.keys(storage);
    const redundantPatterns = ['toppings_', 'categories_'];
    
    const duplicates = new Map<string, number>();
    
    keys.forEach(key => {
      redundantPatterns.forEach(pattern => {
        if (key.includes(pattern)) {
          const baseKey = key.replace(/_\d+$/, ''); // Remove timestamp-like suffixes
          duplicates.set(baseKey, (duplicates.get(baseKey) || 0) + 1);
        }
      });
    });
    
    return Array.from(duplicates.values()).reduce((sum, count) => 
      sum + Math.max(0, count - 1), 0
    );
  }

  private calculateStalePercentage(): number {
    const storage = localStorage;
    const keys = Object.keys(storage);
    let totalCacheEntries = 0;
    let staleEntries = 0;
    
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        totalCacheEntries++;
        try {
          const item = JSON.parse(storage.getItem(key) || '{}');
          const age = Date.now() - (item.timestamp || 0);
          const maxAge = 15 * 60 * 1000; // 15 minutes
          
          if (age > maxAge) {
            staleEntries++;
          }
        } catch (error) {
          // Invalid cache entry, consider it stale
          staleEntries++;
        }
      }
    });
    
    return totalCacheEntries > 0 ? (staleEntries / totalCacheEntries) * 100 : 0;
  }

  async performSmartOptimization(restaurantId?: string): Promise<OptimizationResult> {
    if (this.optimizationInProgress) {
      throw new Error('Optimization already in progress');
    }

    this.optimizationInProgress = true;
    this.lastOptimization = Date.now();
    
    try {
      const health = await this.getCacheHealth();
      const optimizations: string[] = [];
      let clearedEntries = 0;
      let freedBytes = 0;

      // 1. Clear redundant topping/category entries (highest priority)
      if (health.redundantEntries > 0) {
        const result = await this.clearRedundantEntries();
        clearedEntries += result.entries;
        freedBytes += result.bytes;
        optimizations.push(`Removed ${result.entries} redundant cache entries`);
      }

      // 2. Handle memory pressure
      if (health.memoryPressure === 'high') {
        const result = await this.performEmergencyCleanup(restaurantId);
        clearedEntries += result.entries;
        freedBytes += result.bytes;
        optimizations.push('Emergency memory cleanup performed');
      }

      // 3. Clean stale entries if significant percentage
      if (health.stalePercentage > 30) {
        const result = await this.clearStaleEntries();
        clearedEntries += result.entries;
        freedBytes += result.bytes;
        optimizations.push(`Cleared ${result.entries} stale cache entries`);
      }

      // 4. Coordinate with cache coordinator
      await cacheCoordinator.performMemoryOptimization();
      optimizations.push('Performed coordinated cache optimization');

      if (import.meta.env.DEV) {
        console.log('[EnhancedCacheManager] Optimization complete:', {
          clearedEntries,
          freedBytes,
          optimizations
        });
      }

      return { clearedEntries, freedBytes, optimizations };
      
    } finally {
      this.optimizationInProgress = false;
    }
  }

  private async clearRedundantEntries(): Promise<{ entries: number, bytes: number }> {
    const storage = localStorage;
    const keys = Object.keys(storage);
    let clearedEntries = 0;
    let freedBytes = 0;

    // Group keys by their base pattern
    const groupedKeys = new Map<string, string[]>();
    
    keys.forEach(key => {
      if (key.includes('toppings_') || key.includes('categories_')) {
        const baseKey = key.replace(/_\d+$/, '').replace(/restaurant_\w+_/, '');
        if (!groupedKeys.has(baseKey)) {
          groupedKeys.set(baseKey, []);
        }
        groupedKeys.get(baseKey)!.push(key);
      }
    });

    // Keep only the most recent entry for each group
    groupedKeys.forEach((keyGroup) => {
      if (keyGroup.length > 1) {
        // Sort by timestamp (if available in key) or by last access
        keyGroup.sort((a, b) => {
          const aItem = this.getCacheItemSafely(a);
          const bItem = this.getCacheItemSafely(b);
          return (bItem?.timestamp || 0) - (aItem?.timestamp || 0);
        });

        // Remove all but the most recent
        for (let i = 1; i < keyGroup.length; i++) {
          const item = storage.getItem(keyGroup[i]);
          if (item) {
            freedBytes += item.length;
            storage.removeItem(keyGroup[i]);
            clearedEntries++;
          }
        }
      }
    });

    return { entries: clearedEntries, bytes: freedBytes };
  }

  private getCacheItemSafely(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private async performEmergencyCleanup(restaurantId?: string): Promise<{ entries: number, bytes: number }> {
    let clearedEntries = 0;
    let freedBytes = 0;

    // Clear old menu caches for other restaurants
    if (restaurantId) {
      clearMenuCache(restaurantId);
      clearedEntries += 10; // Estimate
    }

    // Clear image cache
    clearCacheByType('image');
    clearedEntries += 20; // Estimate
    freedBytes += 1024 * 1024; // Estimate 1MB

    // Clear old authentication caches
    clearCacheByType('auth');
    clearedEntries += 5; // Estimate

    return { entries: clearedEntries, bytes: freedBytes };
  }

  private async clearStaleEntries(): Promise<{ entries: number, bytes: number }> {
    const storage = localStorage;
    const keys = Object.keys(storage);
    let clearedEntries = 0;
    let freedBytes = 0;
    const maxAge = 15 * 60 * 1000; // 15 minutes

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        const item = this.getCacheItemSafely(key);
        if (item) {
          const age = Date.now() - (item.timestamp || 0);
          if (age > maxAge) {
            const itemString = storage.getItem(key);
            if (itemString) {
              freedBytes += itemString.length;
              storage.removeItem(key);
              clearedEntries++;
            }
          }
        }
      }
    });

    return { entries: clearedEntries, bytes: freedBytes };
  }

  async forceFullOptimization(restaurantId: string): Promise<OptimizationResult> {
    // Force a complete cache refresh and optimization
    await startupPreloader.forceRefresh(restaurantId);
    return this.performSmartOptimization(restaurantId);
  }

  getOptimizationStatus(): { inProgress: boolean, lastRun: number } {
    return {
      inProgress: this.optimizationInProgress,
      lastRun: this.lastOptimization
    };
  }
}

export const enhancedCacheManager = EnhancedCacheManager.getInstance();

// Convenience exports
export const getCacheHealth = () => enhancedCacheManager.getCacheHealth();
export const optimizeCache = (restaurantId?: string) => enhancedCacheManager.performSmartOptimization(restaurantId);
export const forceFullOptimization = (restaurantId: string) => enhancedCacheManager.forceFullOptimization(restaurantId);
