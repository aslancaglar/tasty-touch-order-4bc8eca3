
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOnline as checkIsOnline } from '@/utils/service-worker';
import { getCacheItem, setCacheItem } from '@/services/cache-service';

// Define the options type directly with all required properties
interface NetworkAwareFetchOptions<TData, TError> {
  fetchFn: () => Promise<TData>;
  cacheKey: string;
  restaurantId: string;
  stallTime?: number; // Time in ms to stall before showing loading state
  forceNetwork?: boolean; // Force network fetch even when offline
  // Include query options as separate properties
  queryKey: unknown[]; // Required
  enabled?: boolean;
  retry?: boolean | number;
  retryDelay?: number | ((attemptIndex: number) => number);
  staleTime?: number;
  gcTime?: number;
  refetchOnMount?: boolean | "always";
  refetchOnWindowFocus?: boolean | "always";
  refetchOnReconnect?: boolean | "always";
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
}

interface NetworkAwareFetchResult<TData, TError> {
  isFromCache: boolean;
  lastUpdated: Date | null;
  connectionStatus: 'online' | 'offline';
  refreshData: () => void;
  // Include all necessary UseQueryResult properties
  data: TData | undefined;
  dataUpdatedAt: number;
  error: TError | null;
  errorUpdatedAt: number;
  failureCount: number;
  failureReason: Error | null;
  errorUpdateCount: number;
  isError: boolean;
  isFetched: boolean;
  isFetchedAfterMount: boolean;
  isFetching: boolean;
  isLoading: boolean;
  isLoadingError: boolean;
  isPaused: boolean;
  isPlaceholderData: boolean;
  isPending: boolean;
  isRefetchError: boolean;
  isRefetching: boolean;
  isStale: boolean;
  isSuccess: boolean;
  refetch: (options?: { throwOnError?: boolean; cancelRefetch?: boolean }) => Promise<any>;
  status: 'error' | 'loading' | 'success' | 'pending';
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

export function useNetworkAwareFetch<TData, TError = Error>({
  fetchFn,
  cacheKey,
  restaurantId,
  stallTime = 50,
  forceNetwork = false,
  queryKey, // Required
  ...queryOptions
}: NetworkAwareFetchOptions<TData, TError>): NetworkAwareFetchResult<TData, TError> {
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());

  useEffect(() => {
    // Fix: Use window events directly instead of non-existent listener functions
    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Set initial state
    setIsOnline(checkIsOnline());
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  const queryFn = async () => {
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
  };

  const queryResult = useQuery({
    queryKey, // Pass queryKey separately
    queryFn, // Use our custom queryFn
    staleTime: isFromCache ? 0 : 1000 * 60 * 5, // 5 minutes for fresh data, 0 for cached data
    ...queryOptions,
    ...(!isOnline && {
      retry: false, // Don't retry if offline
      refetchOnWindowFocus: false, // Don't refetch on window focus if offline
    })
  });

  const refreshData = () => {
    queryResult.refetch();
  };

  // Create a complete result object with all required properties
  const result: NetworkAwareFetchResult<TData, TError> = {
    isFromCache,
    lastUpdated,
    connectionStatus: isOnline ? 'online' : 'offline',
    refreshData,
    // Spread all queryResult properties
    ...queryResult,
    // Ensure all required properties are present
    data: queryResult.data,
    error: queryResult.error as TError | null,
    status: queryResult.status,
    fetchStatus: queryResult.fetchStatus,
  };

  return result;
}

// Helper hook to get the connection status only
export function useConnectionStatus(): 'online' | 'offline' {
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());

  useEffect(() => {
    // Fix: Use window events directly instead of non-existent listener functions
    const handleOnlineStatus = () => setIsOnline(true);
    const handleOfflineStatus = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // Set initial state
    setIsOnline(checkIsOnline());
    
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);

  return isOnline ? 'online' : 'offline';
}
