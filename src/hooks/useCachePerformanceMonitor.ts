import { useEffect, useState, useCallback, useRef } from 'react';
import { getCacheMetrics, getCacheDiagnostics } from '@/services/cache-coordinator';

interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  storageUsage: number;
  lastUpdated: number;
}

interface CachePerformanceHook {
  metrics: CachePerformanceMetrics;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resetMetrics: () => void;
  getDetailedDiagnostics: () => Promise<any>;
}

export const useCachePerformanceMonitor = (
  intervalMs: number = 10000 // Default 10 seconds
): CachePerformanceHook => {
  const [metrics, setMetrics] = useState<CachePerformanceMetrics>({
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    cacheSize: 0,
    memoryUsage: 0,
    storageUsage: 0,
    lastUpdated: Date.now()
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const metricsHistoryRef = useRef<CachePerformanceMetrics[]>([]);
  
  const updateMetrics = useCallback(async () => {
    try {
      const cacheMetrics = getCacheMetrics();
      const diagnostics = await getCacheDiagnostics();
      
      // Calculate storage usage
      let storageUsage = 0;
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          storageUsage = estimate.usage || 0;
        }
      } catch (error) {
        console.debug('[CacheMonitor] Storage estimate not available');
      }
      
      const newMetrics: CachePerformanceMetrics = {
        hitRate: cacheMetrics.hitRate,
        missRate: cacheMetrics.missRate,
        totalRequests: cacheMetrics.totalRequests,
        cacheSize: Object.keys(diagnostics.strategies || {}).length,
        memoryUsage: diagnostics.storage?.used || 0,
        storageUsage,
        lastUpdated: Date.now()
      };
      
      setMetrics(newMetrics);
      
      // Keep history for trend analysis (last 100 samples)
      metricsHistoryRef.current.push(newMetrics);
      if (metricsHistoryRef.current.length > 100) {
        metricsHistoryRef.current.shift();
      }
      
      // Log performance warnings
      if (newMetrics.hitRate < 70 && newMetrics.totalRequests > 10) {
        console.warn(`[CacheMonitor] Low cache hit rate: ${newMetrics.hitRate.toFixed(1)}%`);
      }
      
      if (newMetrics.storageUsage > 50 * 1024 * 1024) { // 50MB
        console.warn(`[CacheMonitor] High storage usage: ${(newMetrics.storageUsage / 1024 / 1024).toFixed(1)}MB`);
      }
      
    } catch (error) {
      console.error('[CacheMonitor] Error updating metrics:', error);
    }
  }, []);
  
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return; // Already monitoring
    
    setIsMonitoring(true);
    updateMetrics(); // Initial update
    
    intervalRef.current = setInterval(updateMetrics, intervalMs);
    
    console.log(`[CacheMonitor] Started monitoring with ${intervalMs}ms interval`);
  }, [intervalMs, updateMetrics]);
  
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsMonitoring(false);
    console.log('[CacheMonitor] Stopped monitoring');
  }, []);
  
  const resetMetrics = useCallback(() => {
    setMetrics({
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheSize: 0,
      memoryUsage: 0,
      storageUsage: 0,
      lastUpdated: Date.now()
    });
    
    metricsHistoryRef.current = [];
    console.log('[CacheMonitor] Metrics reset');
  }, []);
  
  const getDetailedDiagnostics = useCallback(async () => {
    const diagnostics = await getCacheDiagnostics();
    const history = metricsHistoryRef.current.slice(-10); // Last 10 samples
    
    return {
      current: metrics,
      history,
      detailed: diagnostics,
      trends: {
        hitRateTrend: history.length > 1 ? 
          history[history.length - 1].hitRate - history[0].hitRate : 0,
        requestsTrend: history.length > 1 ?
          history[history.length - 1].totalRequests - history[0].totalRequests : 0
      }
    };
  }, [metrics]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);
  
  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    getDetailedDiagnostics
  };
};
