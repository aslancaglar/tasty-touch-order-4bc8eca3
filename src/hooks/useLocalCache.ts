
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

type CacheItem<T> = {
  data: T;
  timestamp: number;
};

export const useLocalCache = () => {
  const setCache = <T>(key: string, data: T) => {
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  };

  const getCache = <T>(key: string): T | null => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const cacheItem: CacheItem<T> = JSON.parse(cached);
    const isExpired = Date.now() - cacheItem.timestamp > CACHE_DURATION;

    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return cacheItem.data;
  };

  const clearCache = (key: string) => {
    localStorage.removeItem(key);
  };

  return { setCache, getCache, clearCache };
};
