
import { useState, useEffect } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { addOnlineStatusListener, removeOnlineStatusListener, isOnline as checkIsOnline } from '@/utils/service-worker';
import { getCacheItem, setCacheItem } from '@/services/cache-service';

interface NetworkAwareFetchOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  fetchFn: () => Promise<TData>;
  cacheKey: string;
  restaurantId: string;
  stallTime?: number; // Time in ms to stall before showing loading state
  forceNetwork?: boolean; // Force network fetch even when offline
}

interface NetworkAwareFetchResult<TData, TError> extends UseQueryResult<TData, TError> {
  isFromCache: boolean;
  lastUpdated: Date | null;
  connectionStatus: 'online' | 'offline';
  refreshData: () => void;
}

export function useNetworkAwareFetch<TData, TError = Error>({
  fetchFn,
  cacheKey,
  restaurantId,
  stallTime = 50,
  forceNetwork = false,
  ...queryOptions
}: NetworkAwareFetchOptions<TData, TError>): NetworkAwareFetchResult<TData, TError> {
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());

  useEffect(() => {
    const handleOnlineStatusChange = (status: boolean) => {
      setIsOnline(status);
    };

    addOnlineStatusListener(handleOnlineStatusChange);
    return () => {
      removeOnlineStatusListener(handleOnlineStatusChange);
    };
  }, []);

  const queryResult = useQuery({
    ...queryOptions,
    queryFn: async () => {
      // First check if we have cached data
      const cachedData = getCacheItem<TData>(cacheKey, restaurantId);
      
      // If we're offline and have cached data, use it
      if (!isOnline && cachedData) {
        console.log(`[Network] Offline - Using cached data for ${cacheKey}`);
        setIsFromCache(true);
        return cachedData;
      }

      // If we're online, try to fetch from network
      if (isOnline || forceNetwork) {
        try {
          console.log(`[Network] Online - Fetching fresh data for ${cacheKey}`);
          const freshData = await fetchFn();
          
          // Update the cache with fresh data
          setCacheItem(cacheKey, freshData, restaurantId);
          setLastUpdated(new Date());
          setIsFromCache(false);
          
          return freshData;
        } catch (error) {
          console.error(`[Network] Fetch failed - Falling back to cache for ${cacheKey}`, error);
          
          // If network request fails and we have cached data, use it
          if (cachedData) {
            console.log(`[Network] Using cached data as fallback for ${cacheKey}`);
            setIsFromCache(true);
            return cachedData;
          }
          
          // If no cache, rethrow the error
          throw error;
        }
      }
      
      // We're offline and don't have cached data
      if (cachedData) {
        console.log(`[Network] Offline - Using cached data for ${cacheKey}`);
        setIsFromCache(true);
        return cachedData;
      }
      
      // No cached data and offline - throw a custom error
      throw new Error('You are offline and no cached data is available');
    },
    // Add staleTime to reduce unnecessary refetches
    staleTime: isFromCache ? 0 : 1000 * 60 * 5, // 5 minutes for fresh data, 0 for cached data
    ...(!isOnline && {
      retry: false, // Don't retry if offline
      refetchOnWindowFocus: false, // Don't refetch on window focus if offline
    })
  });

  const refreshData = () => {
    queryResult.refetch();
  };

  return {
    ...queryResult,
    isFromCache,
    lastUpdated,
    connectionStatus: isOnline ? 'online' : 'offline',
    refreshData,
  };
}

// Helper hook to get the connection status only
export function useConnectionStatus(): 'online' | 'offline' {
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());

  useEffect(() => {
    const handleOnlineStatusChange = (status: boolean) => {
      setIsOnline(status);
    };

    addOnlineStatusListener(handleOnlineStatusChange);
    return () => {
      removeOnlineStatusListener(handleOnlineStatusChange);
    };
  }, []);

  return isOnline ? 'online' : 'offline';
}
