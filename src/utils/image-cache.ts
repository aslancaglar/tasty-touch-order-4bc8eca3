
/**
 * A utility for caching images in IndexedDB
 */

const DB_NAME = 'image_cache_db';
const STORE_NAME = 'image_cache';
const DB_VERSION = 1;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

let db: IDBDatabase | null = null;

// Initialize the database
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error opening IndexedDB', event);
      reject('Error opening IndexedDB');
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'url' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Clear expired cache entries
const clearExpiredCache = async (): Promise<void> => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const now = Date.now();
    
    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      
      if (cursor) {
        const entry = cursor.value;
        if (now - entry.timestamp > CACHE_EXPIRY) {
          store.delete(cursor.primaryKey);
        }
        cursor.continue();
      }
    };
    
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};

// Cache an image
export const cacheImage = async (url: string, restaurantId: string): Promise<void> => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
    return;
  }

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await store.put({
      url,
      restaurantId,
      blob,
      timestamp: Date.now()
    });
    
    // Clear expired entries periodically
    clearExpiredCache();
  } catch (error) {
    console.error('Error caching image:', error);
  }
};

// Get a cached image
export const getCachedImage = async (url: string): Promise<string | null> => {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.get(url);
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        
        if (result && result.blob) {
          resolve(URL.createObjectURL(result.blob));
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (error) {
    console.error('Error retrieving cached image:', error);
    return null;
  }
};

// Clear cached images for a restaurant
export const clearCachedImages = async (restaurantId: string | null = null): Promise<void> => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    if (restaurantId) {
      // Clear only images for this restaurant
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value;
          if (entry.restaurantId === restaurantId) {
            store.delete(cursor.primaryKey);
          }
          cursor.continue();
        }
      };
    } else {
      // Clear all images
      store.clear();
    }
  } catch (error) {
    console.error('Error clearing cached images:', error);
  }
};

// Get stats about cached images
export const getImageCacheStats = async (restaurantId: string | null = null): Promise<{ count: number, size: number }> => {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      let count = 0;
      let totalSize = 0;
      
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value;
          
          if (!restaurantId || entry.restaurantId === restaurantId) {
            count++;
            if (entry.blob && entry.blob.size) {
              totalSize += entry.blob.size;
            }
          }
          
          cursor.continue();
        } else {
          resolve({
            count,
            size: Math.round(totalSize / 1024) // Size in KB
          });
        }
      };
      
      request.onerror = () => {
        resolve({ count: 0, size: 0 });
      };
    });
  } catch (error) {
    console.error('Error getting image cache stats:', error);
    return { count: 0, size: 0 };
  }
};

// Update the clearCache in cache-utils.ts to also clear images
export const clearAllCache = async (restaurantId: string | null = null): Promise<void> => {
  // Clear localStorage cache
  if (typeof window !== 'undefined') {
    const CACHE_PREFIX = 'kiosk_cache_';
    
    if (restaurantId) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${CACHE_PREFIX}${restaurantId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } else {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
  
  // Clear image cache
  await clearCachedImages(restaurantId);
};
