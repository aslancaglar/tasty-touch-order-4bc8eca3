import { useState, useEffect, useCallback } from 'react';
import { MenuItemWithOptions } from '@/types/database-types';
import { getMenuItemWithOptions } from '@/services/kiosk-service';
import { getCacheItem, setCacheItem, isCacheStale } from '@/services/cache-service';

interface UseMenuItemDetailsResult {
  itemDetails: MenuItemWithOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const itemDetailsCache = new Map<string, MenuItemWithOptions>();

export const useMenuItemDetails = (
  itemId: string | null,
  restaurantId: string
): UseMenuItemDetailsResult => {
  console.log('useMenuItemDetails called:', { itemId, restaurantId });
  
  const [itemDetails, setItemDetails] = useState<MenuItemWithOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItemDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Check memory cache first
      if (itemDetailsCache.has(id)) {
        const cached = itemDetailsCache.get(id)!;
        setItemDetails(cached);
        setLoading(false);
        return;
      }

      // Check localStorage cache
      const cacheKey = `menuItem_${id}`;
      const cachedItem = getCacheItem<MenuItemWithOptions>(cacheKey, restaurantId);
      
      if (cachedItem && !isCacheStale(cacheKey, restaurantId)) {
        itemDetailsCache.set(id, cachedItem);
        setItemDetails(cachedItem);
        setLoading(false);
        return;
      }

      // Fetch from API
      const details = await getMenuItemWithOptions(id);
      if (details) {
        // Cache in both memory and localStorage
        itemDetailsCache.set(id, details);
        setCacheItem(cacheKey, details, restaurantId);
        setItemDetails(details);
      } else {
        setError('Item not found');
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError('Failed to load item details');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const refetch = useCallback(async () => {
    if (itemId) {
      // Clear cache and refetch
      itemDetailsCache.delete(itemId);
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