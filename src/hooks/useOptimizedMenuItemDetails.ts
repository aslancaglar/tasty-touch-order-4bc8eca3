import { useState, useEffect, useCallback } from 'react';
import { MenuItemWithOptions } from '@/types/database-types';
import { batchGetMenuItemsWithOptions, getMenuItemWithOptionsOptimized } from '@/services/menu-batch-service';
import { getCacheItem, setCacheItem, isCacheStale } from '@/services/cache-service';

interface UseOptimizedMenuItemDetailsResult {
  itemDetails: MenuItemWithOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Enhanced memory cache with metadata
interface CacheEntry {
  data: MenuItemWithOptions;
  timestamp: number;
  accessCount: number;
}

const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50; // Limit memory cache size

class OptimizedMenuItemCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];

  get(itemId: string): MenuItemWithOptions | null {
    const entry = this.cache.get(itemId);
    if (!entry) return null;

    // Check if entry is stale
    if (Date.now() - entry.timestamp > MEMORY_CACHE_TTL) {
      this.cache.delete(itemId);
      this.accessOrder = this.accessOrder.filter(id => id !== itemId);
      return null;
    }

    // Update access count and order
    entry.accessCount++;
    this.accessOrder = this.accessOrder.filter(id => id !== itemId);
    this.accessOrder.push(itemId);

    return entry.data;
  }

  set(itemId: string, data: MenuItemWithOptions): void {
    // Remove oldest entries if cache is full
    while (this.cache.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
      const oldestId = this.accessOrder.shift()!;
      this.cache.delete(oldestId);
    }

    this.cache.set(itemId, {
      data,
      timestamp: Date.now(),
      accessCount: 1
    });

    this.accessOrder.push(itemId);
  }

  delete(itemId: string): void {
    this.cache.delete(itemId);
    this.accessOrder = this.accessOrder.filter(id => id !== itemId);
  }

  preload(items: { [itemId: string]: MenuItemWithOptions }): void {
    Object.entries(items).forEach(([itemId, data]) => {
      if (!this.cache.has(itemId)) {
        this.set(itemId, data);
      }
    });
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
      items: Array.from(this.cache.entries()).map(([id, entry]) => ({
        id,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp
      }))
    };
  }
}

const optimizedCache = new OptimizedMenuItemCache();

export const useOptimizedMenuItemDetails = (
  itemId: string | null,
  restaurantId: string
): UseOptimizedMenuItemDetailsResult => {
  const [itemDetails, setItemDetails] = useState<MenuItemWithOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItemDetails = useCallback(async (id: string) => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Check optimized memory cache first
      const cachedItem = optimizedCache.get(id);
      if (cachedItem) {
        console.log(`[OptimizedHook] Memory cache HIT for item ${id}`);
        setItemDetails(cachedItem);
        setLoading(false);
        return;
      }

      // Check localStorage cache
      const cacheKey = `menuItem_${id}`;
      const localCachedItem = getCacheItem<MenuItemWithOptions>(cacheKey, restaurantId);
      
      if (localCachedItem && !isCacheStale(cacheKey, restaurantId)) {
        console.log(`[OptimizedHook] Local cache HIT for item ${id}`);
        optimizedCache.set(id, localCachedItem);
        setItemDetails(localCachedItem);
        setLoading(false);
        return;
      }

      // Fetch from optimized service
      console.log(`[OptimizedHook] Fetching item ${id} from API`);
      const details = await getMenuItemWithOptionsOptimized(id);
      
      if (details) {
        // Cache in both memory and localStorage
        optimizedCache.set(id, details);
        setCacheItem(cacheKey, details, restaurantId);
        setItemDetails(details);
        
        const endTime = performance.now();
        console.log(`[OptimizedHook] Successfully fetched item ${id} in ${(endTime - startTime).toFixed(2)}ms`);
      } else {
        setError('Item not found');
      }
    } catch (err) {
      console.error(`[OptimizedHook] Error fetching item ${id}:`, err);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const refetch = useCallback(async () => {
    if (itemId) {
      // Clear cache and refetch
      optimizedCache.delete(itemId);
      await fetchItemDetails(itemId);
    }
  }, [itemId, fetchItemDetails]);

  useEffect(() => {
    if (itemId) {
      fetchItemDetails(itemId);
    } else {
      setItemDetails(null);
      setLoading(false);
      setError(null);
    }
  }, [itemId, fetchItemDetails]);

  return {
    itemDetails,
    loading,
    error,
    refetch
  };
};

// Enhanced preloader with predictive caching and stale-while-revalidate
export const useMenuItemPreloader = () => {
  const preloadItems = useCallback(async (itemIds: string[], restaurantId: string) => {
    if (itemIds.length === 0) return;

    const startTime = performance.now();
    console.log(`[Preloader] Preloading ${itemIds.length} items`);

    try {
      // Filter out items that are already in memory cache
      const uncachedItems = itemIds.filter(id => !optimizedCache.get(id));
      
      if (uncachedItems.length === 0) {
        console.log('[Preloader] All items already cached in memory');
        return;
      }

      // Batch fetch uncached items
      const batchResult = await batchGetMenuItemsWithOptions(uncachedItems);
      
      // Process results and cache successful ones
      const successfulItems: { [itemId: string]: MenuItemWithOptions } = {};
      
      Object.entries(batchResult).forEach(([itemId, result]) => {
        if (result.success && result.data) {
          successfulItems[itemId] = result.data;
          
          // Cache in localStorage too with timestamp for stale-while-revalidate
          const cacheKey = `menuItem_${itemId}`;
          setCacheItem(cacheKey, {
            data: result.data,
            timestamp: Date.now(),
            version: 1
          }, restaurantId);
        }
      });

      // Bulk update memory cache
      optimizedCache.preload(successfulItems);
      
      const endTime = performance.now();
      console.log(`[Preloader] Preloaded ${Object.keys(successfulItems).length}/${itemIds.length} items in ${(endTime - startTime).toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[Preloader] Failed to preload items:', error);
    }
  }, []);

  // Predictive preloading based on user behavior patterns
  const predictivePreload = useCallback(async (currentItemId: string, restaurantId: string, allMenuItems: string[]) => {
    // Simple prediction: preload items from the same category and popular items
    const relatedItems = allMenuItems
      .filter(id => id !== currentItemId)
      .slice(0, 5); // Preload next 5 items

    if (relatedItems.length > 0) {
      console.log(`[Preloader] Predictive preloading ${relatedItems.length} related items`);
      await preloadItems(relatedItems, restaurantId);
    }
  }, [preloadItems]);

  // Background refresh for stale data
  const backgroundRefresh = useCallback(async (itemId: string, restaurantId: string) => {
    console.log(`[Preloader] Background refresh for item ${itemId}`);
    try {
      const batchResult = await batchGetMenuItemsWithOptions([itemId]);
      if (batchResult[itemId]?.success && batchResult[itemId]?.data) {
        optimizedCache.set(itemId, batchResult[itemId].data as MenuItemWithOptions);
        
        const cacheKey = `menuItem_${itemId}`;
        setCacheItem(cacheKey, {
          data: batchResult[itemId].data,
          timestamp: Date.now(),
          version: 1
        }, restaurantId);
      }
    } catch (error) {
      console.error(`[Preloader] Background refresh failed for ${itemId}:`, error);
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return optimizedCache.getCacheStats();
  }, []);

  return {
    preloadItems,
    predictivePreload,
    backgroundRefresh,
    getCacheStats
  };
};