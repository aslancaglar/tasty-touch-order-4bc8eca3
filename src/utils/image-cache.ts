
// Image cache implementation using IndexedDB for larger files

// Set constants for cache management
const IMAGE_CACHE_DB_NAME = 'imageCache';
const IMAGE_CACHE_STORE_NAME = 'images';
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Function to open the IndexedDB database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_CACHE_DB_NAME, 1);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event);
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGE_CACHE_STORE_NAME)) {
        const objectStore = db.createObjectStore(IMAGE_CACHE_STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('restaurantId', 'restaurantId', { unique: false });
      }
    };
  });
};

// Function to save an image to the cache
export const saveImageToCache = async (
  id: string, 
  url: string, 
  restaurantId: string,
  blob: Blob
): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_CACHE_STORE_NAME, 'readwrite');
    const objectStore = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    const cacheEntry = {
      id: `${restaurantId}_${id}`,
      url,
      restaurantId,
      blob,
      timestamp: Date.now()
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = objectStore.put(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = (e) => {
        console.error('Error saving image to cache:', e);
        reject(e);
      };
    });
  } catch (error) {
    console.error('Failed to save image to cache:', error);
  }
};

// Function to get an image from the cache
export const getImageFromCache = async (id: string, restaurantId: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_CACHE_STORE_NAME, 'readonly');
    const objectStore = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    
    const cacheEntry = await new Promise<any>((resolve, reject) => {
      const request = objectStore.get(`${restaurantId}_${id}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => {
        console.error('Error getting image from cache:', e);
        reject(e);
      };
    });
    
    if (cacheEntry && cacheEntry.timestamp > Date.now() - IMAGE_CACHE_TTL) {
      return cacheEntry.blob;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get image from cache:', error);
    return null;
  }
};

// Function to cache an image from a URL
export const cacheImage = async (url: string, restaurantId: string): Promise<void> => {
  try {
    // Skip if URL is empty or not a valid URL
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return;
    }

    // Generate a simple hash as ID from the URL
    const id = url.split('/').pop() || url;
    
    // Fetch the image
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Save to cache
    await saveImageToCache(id, url, restaurantId, blob);
  } catch (error) {
    console.error(`Failed to cache image from URL ${url}:`, error);
  }
};

// Function to get a cached image by URL
export const getCachedImage = async (url: string): Promise<string | null> => {
  try {
    // Skip if URL is empty or not a valid URL
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Generate a simple hash as ID from the URL
    const id = url.split('/').pop() || url;
    const restaurantId = 'global'; // Default restaurantId for URL-based caching
    
    // Try to get from cache
    const cachedBlob = await getImageFromCache(id, restaurantId);
    
    if (cachedBlob) {
      return URL.createObjectURL(cachedBlob);
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to get cached image for URL ${url}:`, error);
    return null;
  }
};

// Function to get cache statistics for a restaurant
export const getImageCacheStats = async (restaurantId: string): Promise<{ count: number, size: number }> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_CACHE_STORE_NAME, 'readonly');
    const objectStore = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    const index = objectStore.index('restaurantId');
    
    const entries = await new Promise<any[]>((resolve, reject) => {
      const request = index.getAll(restaurantId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => {
        console.error('Error getting image cache stats:', e);
        reject(e);
      };
    });
    
    const totalSize = entries.reduce((total, entry) => {
      return total + (entry.blob ? entry.blob.size : 0);
    }, 0);
    
    return {
      count: entries.length,
      size: Math.round(totalSize / 1024) // Convert bytes to KB
    };
  } catch (error) {
    console.error('Failed to get image cache stats:', error);
    return { count: 0, size: 0 };
  }
};

// Function to clear all cached images for a restaurant
export const clearCachedImages = async (restaurantId: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(IMAGE_CACHE_STORE_NAME, 'readwrite');
    const objectStore = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    const index = objectStore.index('restaurantId');
    
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const keyRequest = index.getAllKeys(restaurantId);
      keyRequest.onsuccess = () => resolve(keyRequest.result);
      keyRequest.onerror = (e) => {
        console.error('Error getting image cache keys:', e);
        reject(e);
      };
    });
    
    await Promise.all(keys.map(key => 
      new Promise<void>((resolve, reject) => {
        const deleteRequest = objectStore.delete(key);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = (e) => {
          console.error('Error deleting image from cache:', e);
          reject(e);
        };
      })
    ));
    
    console.log(`Cleared ${keys.length} cached images for restaurant ${restaurantId}`);
  } catch (error) {
    console.error('Failed to clear cached images:', error);
    throw error;
  }
};

// Function to clear all caches for a restaurant (both data and images)
export const clearAllCache = async (restaurantId: string): Promise<void> => {
  try {
    // Import data cache utilities to avoid circular dependency
    const { clearCache } = await import('./cache-utils');
    
    // Clear data cache
    clearCache(restaurantId);
    
    // Clear image cache
    await clearCachedImages(restaurantId);
    
    console.log(`All caches cleared for restaurant ${restaurantId}`);
  } catch (error) {
    console.error('Failed to clear all caches:', error);
    throw error;
  }
};
