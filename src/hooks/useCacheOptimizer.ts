import { useEffect, useCallback, useState } from 'react';
import { cacheCoordinator, getCacheMetrics, invalidateCache } from '@/services/cache-coordinator';
import { isOnline } from '@/utils/service-worker';

interface CacheOptimizerOptions {
  restaurantId: string;
  enableBackgroundCleanup?: boolean;
  memoryThreshold?: number; // Percentage of memory usage to trigger cleanup
  cleanupInterval?: number; // Minutes between cleanup runs
}

interface CacheOptimizerResult {
  metrics: ReturnType<typeof getCacheMetrics>;
  performCleanup: () => Promise<void>;
  invalidateAll: () => Promise<void>;
  isOptimizing: boolean;
  memoryUsage: number;
  recommendedActions: string[];
}

export const useCacheOptimizer = ({
  restaurantId,
  enableBackgroundCleanup = true,
  memoryThreshold = 75,
  cleanupInterval = 15
}: CacheOptimizerOptions): CacheOptimizerResult => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [recommendedActions, setRecommendedActions] = useState<string[]>([]);
  const [metrics, setMetrics] = useState(getCacheMetrics());

  // Performance monitoring and optimization
  const analyzePerformance = useCallback(async () => {
    try {
      const currentMetrics = getCacheMetrics();
      const diagnostics = await cacheCoordinator.getDiagnostics();
      
      setMetrics(currentMetrics);
      setMemoryUsage(diagnostics.storage.usagePercentage);
      
      const actions: string[] = [];
      
      // Analyze hit rate
      if (currentMetrics.hitRate < 60) {
        actions.push('Low cache hit rate detected. Consider adjusting cache strategies.');
      }
      
      // Check memory usage
      if (diagnostics.storage.usagePercentage > memoryThreshold) {
        actions.push('High memory usage detected. Cleanup recommended.');
      }
      
      // Check background queue
      if (diagnostics.backgroundQueue > 10) {
        actions.push('High background refresh queue. Network optimization needed.');
      }
      
      // Check if offline for extended period
      if (!diagnostics.onlineStatus) {
        actions.push('Device offline. Ensure cache is adequate for offline experience.');
      }
      
      setRecommendedActions(actions);
    } catch (error) {
      console.error('[CacheOptimizer] Performance analysis failed:', error);
    }
  }, [memoryThreshold]);

  // Manual cleanup function
  const performCleanup = useCallback(async () => {
    setIsOptimizing(true);
    try {
      console.log('[CacheOptimizer] Starting manual cleanup...');
      await cacheCoordinator.performMemoryOptimization();
      await analyzePerformance();
      console.log('[CacheOptimizer] Manual cleanup completed');
    } catch (error) {
      console.error('[CacheOptimizer] Manual cleanup failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [analyzePerformance]);

  // Invalidate all cache for restaurant
  const invalidateAll = useCallback(async () => {
    setIsOptimizing(true);
    try {
      console.log('[CacheOptimizer] Invalidating all cache...');
      await invalidateCache('manual_invalidate', restaurantId);
      await analyzePerformance();
      console.log('[CacheOptimizer] Cache invalidation completed');
    } catch (error) {
      console.error('[CacheOptimizer] Cache invalidation failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [restaurantId, analyzePerformance]);

  // Automatic optimization based on conditions
  const performAutoOptimization = useCallback(async () => {
    if (isOptimizing) return;
    
    try {
      const diagnostics = await cacheCoordinator.getDiagnostics();
      
      // Auto-cleanup if memory usage is high
      if (diagnostics.storage.usagePercentage > memoryThreshold) {
        console.log('[CacheOptimizer] Auto-cleanup triggered due to high memory usage');
        await performCleanup();
      }
      
      // Schedule background refresh if online and queue is manageable
      if (isOnline() && diagnostics.backgroundQueue < 5) {
        // Trigger background refresh for stale cache entries
        console.log('[CacheOptimizer] Scheduling background refresh for stale entries');
      }
    } catch (error) {
      console.error('[CacheOptimizer] Auto-optimization failed:', error);
    }
  }, [isOptimizing, memoryThreshold, performCleanup]);

  // Background monitoring and cleanup
  useEffect(() => {
    let monitoringInterval: number;
    let cleanupInterval: number;

    if (enableBackgroundCleanup) {
      // Performance monitoring every 30 seconds
      monitoringInterval = window.setInterval(analyzePerformance, 30000);
      
      // Auto-optimization every cleanupInterval minutes
      cleanupInterval = window.setInterval(
        performAutoOptimization, 
        cleanupInterval * 60 * 1000
      );
    }

    // Initial analysis
    analyzePerformance();

    return () => {
      if (monitoringInterval) clearInterval(monitoringInterval);
      if (cleanupInterval) clearInterval(cleanupInterval);
    };
  }, [enableBackgroundCleanup, analyzePerformance, performAutoOptimization, cleanupInterval]);

  // React to online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[CacheOptimizer] Device online - refreshing performance analysis');
      analyzePerformance();
    };

    const handleOffline = () => {
      console.log('[CacheOptimizer] Device offline - updating recommendations');
      analyzePerformance();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [analyzePerformance]);

  return {
    metrics,
    performCleanup,
    invalidateAll,
    isOptimizing,
    memoryUsage,
    recommendedActions
  };
};