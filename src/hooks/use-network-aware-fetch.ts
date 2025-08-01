
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isOnline as checkIsOnline, retryNetworkRequest } from '@/utils/service-worker';
import { getCachedData, setCachedData } from '@/services/cache-coordinator';

// Define the options type directly with all required properties
interface NetworkAwareFetchOptions<TData, TError> {
  fetchFn: () => Promise<TData>;
  cacheKey: string;
  restaurantId: string;
  stallTime?: number; // Time in ms to stall before showing loading state
  forceNetwork?: boolean; // Force network fetch even when offline
  fallbackToCache?: boolean; // Whether to fallback to cache on network errors
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
  isNetworkError: boolean;
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
  fallbackToCache = true,
  queryKey, // Required
  ...queryOptions
}: NetworkAwareFetchOptions<TData, TError>): NetworkAwareFetchResult<TData, TError> {
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());
  const [isNetworkError, setIsNetworkError] = useState<boolean>(false);

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(true);
      setIsNetworkError(false);
      console.log('[NetworkAware] Device back online');
    };
    
    const handleOfflineStatus = () => {
      setIsOnline(false);
      console.log('[NetworkAware] Device offline');
    };
    
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
    console.log(`[NetworkAware] Fetching data for ${cacheKey} - Online: ${isOnline}`);
    
    // First check if we have cached data
    const cachedData = await getCachedData<TData>(cacheKey, restaurantId);
    
    // If we're offline and have cached data, use it immediately
    if (!isOnline && cachedData && !forceNetwork) {
      console.log(`[NetworkAware] Offline - Using cached data for ${cacheKey}`);
      setIsFromCache(true);
      setIsNetworkError(false);
      return cachedData;
    }

    // If we're online or forced to use network, try to fetch
    if (isOnline || forceNetwork) {
      try {
        console.log(`[NetworkAware] Attempting network fetch for ${cacheKey}`);
        
        // Use retry mechanism for better reliability
        const freshData = await retryNetworkRequest(
          fetchFn,
          3, // max retries
          300 // initial delay
        );
        
        console.log(`[NetworkAware] Network fetch successful for ${cacheKey}`);
        
        // Update the cache with fresh data
        await setCachedData(cacheKey, freshData, restaurantId);
        setLastUpdated(new Date());
        setIsFromCache(false);
        setIsNetworkError(false);
        
        return freshData;
      } catch (error) {
        console.error(`[NetworkAware] Network fetch failed for ${cacheKey}:`, error);
        setIsNetworkError(true);
        
        // If network request fails and we have cached data and fallback is enabled, use it
        if (cachedData && fallbackToCache) {
          console.log(`[NetworkAware] Network failed - Using cached data as fallback for ${cacheKey}`);
          setIsFromCache(true);
          return cachedData;
        }
        
        // If no cache or fallback disabled, rethrow the error
        throw error;
      }
    }
    
    // We're offline and don't have cached data
    if (cachedData) {
      console.log(`[NetworkAware] Offline - Using cached data for ${cacheKey}`);
      setIsFromCache(true);
      setIsNetworkError(false);
      return cachedData;
    }
    
    // No cached data and offline - throw a custom error
    const offlineError = new Error('You are offline and no cached data is available');
    setIsNetworkError(true);
    throw offlineError;
  };

  const queryResult = useQuery({
    queryKey, // Pass queryKey separately
    queryFn, // Use our custom queryFn
    staleTime: isFromCache ? 0 : 1000 * 60 * 5, // 5 minutes for fresh data, 0 for cached data
    retry: (failureCount, error) => {
      // Don't retry if we're offline and don't have cache
      if (!isOnline && !getCachedData(cacheKey, restaurantId)) {
        return false;
      }
      // Don't retry more than 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...queryOptions,
    ...(!isOnline && {
      refetchOnWindowFocus: false, // Don't refetch on window focus if offline
    })
  });

  const refreshData = () => {
    console.log(`[NetworkAware] Manual refresh requested for ${cacheKey}`);
    setIsNetworkError(false);
    queryResult.refetch();
  };

  // Create a complete result object with all required properties
  const result: NetworkAwareFetchResult<TData, TError> = {
    isFromCache,
    lastUpdated,
    connectionStatus: isOnline ? 'online' : 'offline',
    refreshData,
    isNetworkError,
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
