import { useState, useEffect, useCallback } from 'react';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getCachedData, setCachedData, invalidateCache } from '@/services/cache-coordinator';
import { isOnline, retryNetworkRequest } from '@/utils/service-worker';

interface EnhancedNetworkFetchOptions<TData, TError = Error> {
  queryKey: string[];
  fetchFn: () => Promise<TData>;
  restaurantId: string;
  isAdmin?: boolean;
  stallTime?: number;
  cacheTime?: number;
  retryAttempts?: number;
  backgroundRefresh?: boolean;
  optimisticUpdates?: boolean;
  invalidateOn?: string[];
}

interface EnhancedNetworkFetchResult<TData, TError = Error> {
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  isFromCache: boolean;
  connectionStatus: 'online' | 'offline';
  cacheAge: number | null;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
  prefetch: () => Promise<void>;
}

export function useEnhancedNetworkFetch<TData, TError = Error>(
  options: EnhancedNetworkFetchOptions<TData, TError>
): EnhancedNetworkFetchResult<TData, TError> {
  const {
    queryKey,
    fetchFn,
    restaurantId,
    isAdmin = false,
    stallTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 30 * 60 * 1000, // 30 minutes
    retryAttempts = 3,
    backgroundRefresh = true,
    optimisticUpdates = false,
    invalidateOn = []
  } = options;

  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline'>(
    isOnline() ? 'online' : 'offline'
  );

  const cacheKey = queryKey.join('_');

  // Enhanced query function with intelligent caching
  const enhancedQueryFn = useCallback(async (): Promise<TData> => {
    console.log(`[EnhancedNetworkFetch] Fetching data for key: ${cacheKey}`);
    
    // Try cache first
    const cachedData = await getCachedData<TData>(cacheKey, restaurantId, isAdmin);
    
    if (cachedData && connectionStatus === 'offline') {
      console.log(`[EnhancedNetworkFetch] Using cached data (offline): ${cacheKey}`);
      setIsFromCache(true);
      return cachedData;
    }

    // If online, try network request with fallback to cache
    if (connectionStatus === 'online') {
      try {
        const networkData = await retryNetworkRequest(fetchFn, retryAttempts);
        
        // Update cache with fresh data
        await setCachedData(cacheKey, networkData, restaurantId, isAdmin);
        
        console.log(`[EnhancedNetworkFetch] Fresh data retrieved: ${cacheKey}`);
        setIsFromCache(false);
        setCacheAge(0);
        
        return networkData;
      } catch (networkError) {
        console.warn(`[EnhancedNetworkFetch] Network request failed, trying cache: ${cacheKey}`, networkError);
        
        if (cachedData) {
          setIsFromCache(true);
          return cachedData;
        }
        
        throw networkError;
      }
    }

    // If we reach here, we're offline and have no cache
    throw new Error('No cached data available and device is offline');
  }, [cacheKey, restaurantId, isAdmin, connectionStatus, fetchFn, retryAttempts]);

  // React Query configuration with enhanced caching
  const queryResult = useQuery({
    queryKey,
    queryFn: enhancedQueryFn,
    staleTime: stallTime,
    gcTime: cacheTime,
    retry: (failureCount, error) => {
      // Don't retry if offline or if we have cached data
      if (connectionStatus === 'offline') return false;
      return failureCount < retryAttempts;
    },
    refetchOnWindowFocus: connectionStatus === 'online',
    refetchOnReconnect: true,
    enabled: true
  } as UseQueryOptions<TData, TError>);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setConnectionStatus('online');
      if (backgroundRefresh) {
        queryResult.refetch();
      }
    };
    
    const handleOffline = () => setConnectionStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [backgroundRefresh, queryResult]);

  // Handle cache invalidation events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (invalidateOn.some(event => e.key?.includes(event))) {
        queryResult.refetch();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [invalidateOn, queryResult]);

  // Enhanced methods
  const refetch = useCallback(async () => {
    await queryResult.refetch();
  }, [queryResult]);

  const invalidateQuery = useCallback(async () => {
    await invalidateCache(cacheKey, restaurantId);
    await queryResult.refetch();
  }, [cacheKey, restaurantId, queryResult]);

  const prefetch = useCallback(async () => {
    if (connectionStatus === 'online') {
      try {
        const data = await fetchFn();
        await setCachedData(cacheKey, data, restaurantId, isAdmin);
      } catch (error) {
        console.warn(`[EnhancedNetworkFetch] Prefetch failed for ${cacheKey}:`, error);
      }
    }
  }, [cacheKey, restaurantId, isAdmin, connectionStatus, fetchFn]);

  return {
    data: queryResult.data,
    error: queryResult.error,
    isLoading: queryResult.isLoading,
    isSuccess: queryResult.isSuccess,
    isError: queryResult.isError,
    isFetching: queryResult.isFetching,
    isFromCache,
    connectionStatus,
    cacheAge,
    refetch,
    invalidate: invalidateQuery,
    prefetch
  };
}