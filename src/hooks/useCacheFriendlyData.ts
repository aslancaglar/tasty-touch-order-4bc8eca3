
import { useState, useEffect, useCallback } from 'react';
import { cacheFriendlyFetch, isOnline, forceRefreshCache, getCacheStaleness, isRefreshing } from '../utils/service-worker';

interface CacheFriendlyDataOptions<T> {
  url: string;
  initialData?: T;
  parseResponse?: (data: any) => T;
  cacheTtl?: number; // time-to-live in milliseconds
}

// Default time-to-live for cached data
const DEFAULT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const useCacheFriendlyData = <T,>({
  url,
  initialData,
  parseResponse = (data) => data as T,
  cacheTtl = DEFAULT_CACHE_TTL
}: CacheFriendlyDataOptions<T>) => {
  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  
  // Check if data is stale based on TTL
  const checkStaleness = useCallback(() => {
    const staleness = getCacheStaleness(url);
    
    if (staleness === null) {
      // No cache status available, consider it stale
      setIsStale(true);
      return true;
    }
    
    const stale = staleness > cacheTtl;
    setIsStale(stale);
    return stale;
  }, [url, cacheTtl]);
  
  // Function to fetch data
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!isOnline() && !forceRefresh) {
      // If offline and not forcing refresh, just use what we have
      return;
    }
    
    // If already refreshing, don't start another request
    if (isRefreshing(url) && !forceRefresh) {
      return;
    }
    
    try {
      setIsRefreshingData(true);
      
      // If we're forcing a refresh, use the service worker API
      if (forceRefresh) {
        await forceRefreshCache([url]);
      }
      
      // Use our cache-friendly fetch
      const response = await cacheFriendlyFetch(url, {
        // Use 'reload' cache mode when forcing refresh
        cache: forceRefresh ? 'reload' : 'default'
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.status}`);
      }
      
      const jsonData = await response.json();
      const parsedData = parseResponse(jsonData);
      
      setData(parsedData);
      setError(null);
      setLastUpdated(Date.now());
      setIsStale(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
      setIsRefreshingData(false);
    }
  }, [url, parseResponse]);
  
  // Function to manually refresh data
  const refreshData = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  // Initial fetch and setup staleness check
  useEffect(() => {
    setIsLoading(true);
    fetchData();
    
    // Set up event listeners for cache updates
    const handleCacheUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{url: string}>;
      if (customEvent.detail?.url === url) {
        fetchData();
      }
    };
    
    const handleCacheCleared = () => {
      fetchData();
    };
    
    window.addEventListener('cache-updated', handleCacheUpdated);
    window.addEventListener('cache-cleared', handleCacheCleared);
    
    // Check staleness periodically
    const stalenessInterval = setInterval(() => {
      const isDataStale = checkStaleness();
      
      // If stale and online, trigger background refresh
      if (isDataStale && isOnline() && !isRefreshing(url)) {
        fetchData();
      }
    }, 60000); // Check every minute
    
    return () => {
      window.removeEventListener('cache-updated', handleCacheUpdated);
      window.removeEventListener('cache-cleared', handleCacheCleared);
      clearInterval(stalenessInterval);
    };
  }, [url, fetchData, checkStaleness]);
  
  return {
    data,
    isLoading: isLoading && !data, // Only show loading if we don't have data yet
    isRefreshing: isRefreshingData,
    error,
    refresh: refreshData,
    lastUpdated,
    isStale
  };
};
