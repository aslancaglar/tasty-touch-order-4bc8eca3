import { useEffect, useState, useCallback, useRef } from 'react';
import { MenuItem } from '@/types/database-types';
import { getCachedData, setCachedData } from '@/services/cache-coordinator';
import { startPerf, endPerf } from '@/utils/performance-monitor';

interface CacheOptimizedMenuItemsProps {
  menuItems: MenuItem[];
  restaurantId: string;
  enabled?: boolean;
}

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cachedItems: number;
}

export const useCacheOptimizedMenuItems = ({
  menuItems,
  restaurantId,
  enabled = true
}: CacheOptimizedMenuItemsProps) => {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    cachedItems: 0
  });
  
  const metricsRef = useRef({ hits: 0, misses: 0, total: 0 });
  
  // Predictive preloading based on user interaction patterns
  const predictivePreload = useCallback(async (currentItemId: string) => {
    if (!enabled || !restaurantId) return;
    
    startPerf('predictive-preload');
    
    try {
      // Find related items in the same category
      const currentItem = menuItems.find(item => item.id === currentItemId);
      if (!currentItem) return;
      
      const relatedItems = menuItems
        .filter(item => 
          item.category_id === currentItem.category_id && 
          item.id !== currentItemId &&
          item.in_stock
        )
        .slice(0, 3); // Preload top 3 related items
      
      // Preload related items in background
      const preloadPromises = relatedItems.map(async (item) => {
        const cacheKey = `menu_item_details_${item.id}`;
        const cached = await getCachedData(cacheKey, restaurantId);
        
        if (!cached) {
          // Schedule for background preload
          // This would be handled by the MenuItemPreloader component
          console.log(`[PredictivePreload] Scheduled ${item.id} for preload`);
        }
      });
      
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.error('[PredictivePreload] Error:', error);
    } finally {
      endPerf('predictive-preload');
    }
  }, [menuItems, restaurantId, enabled]);
  
  // Check cache hit ratio for performance monitoring
  const checkCacheMetrics = useCallback(async () => {
    if (!enabled || !restaurantId || menuItems.length === 0) return;
    
    let cachedCount = 0;
    
    for (const item of menuItems.slice(0, 20)) { // Check first 20 items
      const cacheKey = `menu_item_details_${item.id}`;
      const cached = await getCachedData(cacheKey, restaurantId);
      if (cached) cachedCount++;
    }
    
    const sampleSize = Math.min(menuItems.length, 20);
    const hitRate = sampleSize > 0 ? (cachedCount / sampleSize) * 100 : 0;
    
    setMetrics(prev => ({
      ...prev,
      cachedItems: cachedCount,
      hitRate
    }));
    
    // Log metrics for debugging
    if (hitRate < 50) {
      console.warn(`[CacheMetrics] Low cache hit rate: ${hitRate.toFixed(1)}%`);
    }
  }, [menuItems, restaurantId, enabled]);
  
  // Progressive cache warming strategy
  const progressiveWarmup = useCallback(async () => {
    if (!enabled || !restaurantId || menuItems.length === 0) return;
    
    startPerf('progressive-warmup');
    
    try {
      // Warm up cache for visible/priority items first
      const priorityItems = menuItems
        .filter(item => item.in_stock)
        .sort((a, b) => (a.display_order || 1000) - (b.display_order || 1000))
        .slice(0, 10); // Top 10 priority items
      
      // Check which items need caching
      const itemsToCache = [];
      
      for (const item of priorityItems) {
        const cacheKey = `menu_item_details_${item.id}`;
        const cached = await getCachedData(cacheKey, restaurantId);
        
        if (!cached) {
          itemsToCache.push(item.id);
        }
      }
      
      if (itemsToCache.length > 0) {
        console.log(`[ProgressiveWarmup] Caching ${itemsToCache.length} priority items`);
        // The actual caching would be handled by MenuItemPreloader
      }
    } catch (error) {
      console.error('[ProgressiveWarmup] Error:', error);
    } finally {
      endPerf('progressive-warmup');
    }
  }, [menuItems, restaurantId, enabled]);
  
  // Update metrics when cache is accessed
  const trackCacheAccess = useCallback((hit: boolean) => {
    metricsRef.current.total++;
    if (hit) {
      metricsRef.current.hits++;
    } else {
      metricsRef.current.misses++;
    }
    
    const { hits, misses, total } = metricsRef.current;
    setMetrics(prev => ({
      ...prev,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
      missRate: total > 0 ? (misses / total) * 100 : 0,
      totalRequests: total
    }));
  }, []);
  
  // Initialize cache optimization
  useEffect(() => {
    if (enabled && restaurantId && menuItems.length > 0) {
      // Delay initial warmup to avoid blocking UI
      const timeoutId = setTimeout(() => {
        progressiveWarmup();
        checkCacheMetrics();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [enabled, restaurantId, menuItems.length, progressiveWarmup, checkCacheMetrics]);
  
  // Periodic cache metrics check
  useEffect(() => {
    if (!enabled || !restaurantId) return;
    
    const interval = setInterval(checkCacheMetrics, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [enabled, restaurantId, checkCacheMetrics]);
  
  return {
    metrics,
    predictivePreload,
    trackCacheAccess,
    progressiveWarmup
  };
};