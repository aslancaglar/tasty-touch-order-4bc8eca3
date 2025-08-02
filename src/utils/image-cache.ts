
const IMAGE_CACHE_PREFIX = 'kiosk_image_cache_';
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB cache limit
const LOW_MEMORY_THRESHOLD = 20 * 1024 * 1024; // 20MB threshold to start cleaning

interface CachedImage {
  blob: string;
  timestamp: number;
  size: number;
}

// Track total cache size
let estimatedCacheSize = 0;

// Initialize cache size on load
const initCacheSize = () => {
  try {
    estimatedCacheSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            estimatedCacheSize += item.length * 2; // Rough estimate of string size in bytes
          }
        } catch (e) {
          console.error("Error measuring cache item:", e);
        }
      }
    }
    console.log(`Estimated image cache size: ${(estimatedCacheSize / (1024 * 1024)).toFixed(2)}MB`);
  } catch (e) {
    console.error("Error initializing cache size:", e);
  }
};

// Run once on module load
initCacheSize();

const debugCache = (action: string, key: string, hit?: boolean, size?: number) => {
  console.log(
    `Cache ${action}: ${key.replace(IMAGE_CACHE_PREFIX, '')}${
      hit !== undefined ? ` (Cache ${hit ? 'HIT' : 'MISS'})` : ''
    }${size ? ` Size: ${(size / 1024).toFixed(2)}KB` : ''}`
  );
};

// Remove least recently used items until under threshold
const pruneCache = (targetSize = LOW_MEMORY_THRESHOLD) => {
  try {
    if (estimatedCacheSize < targetSize) return;
    
    console.log(`Pruning cache. Current size: ${(estimatedCacheSize / (1024 * 1024)).toFixed(2)}MB`);
    
    // Collect all cache entries with their timestamp and size
    const entries: { key: string; timestamp: number; size: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (!data) continue;
          
          const item: CachedImage = JSON.parse(data);
          const size = data.length * 2;
          entries.push({ key, timestamp: item.timestamp, size });
        } catch (e) {
          // If we can't parse, remove the item
          localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until below threshold
    let removedCount = 0;
    let freedSize = 0;
    
    while (estimatedCacheSize > targetSize && entries.length > 0) {
      const oldest = entries.shift();
      if (!oldest) break;
      
      localStorage.removeItem(oldest.key);
      estimatedCacheSize -= oldest.size;
      freedSize += oldest.size;
      removedCount++;
    }
    
    console.log(`Pruned ${removedCount} items, freed ${(freedSize / (1024 * 1024)).toFixed(2)}MB. ` +
                `New size: ${(estimatedCacheSize / (1024 * 1024)).toFixed(2)}MB`);
  } catch (e) {
    console.error("Error pruning cache:", e);
  }
};

// Check if we need to clean the cache (periodically or when we detect we're above threshold)
const checkCacheSize = () => {
  if (estimatedCacheSize > MAX_CACHE_SIZE) {
    pruneCache();
    return true;
  }
  return false;
};

// Optimize images before caching by reducing quality and dimensions if too large
const optimizeImage = async (blob: Blob, maxWidth = 800): Promise<Blob> => {
  try {
    // For very small images, don't bother optimizing
    if (blob.size < 50 * 1024) return blob; // Skip if under 50KB

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // If image dimensions are small enough, no need to resize
        if (img.width <= maxWidth && blob.size < 200 * 1024) {
          resolve(blob);
          return;
        }
        
        // Calculate new dimensions while maintaining aspect ratio
        const ratio = Math.min(maxWidth / img.width, 1);
        const width = Math.floor(img.width * ratio);
        const height = Math.floor(img.height * ratio);
        
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(blob); // Fallback to original if canvas context fails
          return;
        }
        
        // Draw image onto canvas at reduced size
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with reduced quality
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob);
            } else {
              resolve(blob); // Fallback to original
            }
          },
          'image/jpeg',
          0.85 // 85% quality - good balance between quality and size
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(blob); // Fallback to original
      };
      img.src = url;
    });
  } catch (err) {
    console.error('Error optimizing image:', err);
    return blob; // Return original on error
  }
};

export const cacheImage = async (url: string): Promise<string> => {
  if (!url) return '';
  
  try {
    const cacheKey = `${IMAGE_CACHE_PREFIX}${url}`;
    
    // Check if image is already in cache
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const cached: CachedImage = JSON.parse(cachedData);
        if (Date.now() - cached.timestamp < IMAGE_CACHE_DURATION) {
          debugCache('HIT', cacheKey, true);
          return cached.blob;
        }
        // Remove expired cache
        localStorage.removeItem(cacheKey);
        estimatedCacheSize -= cachedData.length * 2;
        debugCache('EXPIRED', cacheKey);
      } catch (error) {
        console.error('Error parsing cached image data:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    // Check if we need to clean up cache before adding a new item
    checkCacheSize();

    // Fetch image with cache-first strategy
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) {
      console.error(`Failed to fetch image: ${url}`, response.status);
      return url; // Return original URL if fetch fails
    }
    
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      console.error(`Invalid blob for image: ${url}`);
      return url;
    }
    
    // Optimize the image if it's large
    const optimizedBlob = await optimizeImage(blob);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64data = reader.result as string;
          if (!base64data) {
            console.error('Failed to convert image to base64:', url);
            resolve(url); // Return original URL as fallback
            return;
          }
          
          // Calculate size of the data
          const dataSize = base64data.length * 2; // Rough estimate
          
          const cacheData: CachedImage = {
            blob: base64data,
            timestamp: Date.now(),
            size: dataSize
          };
          
          try {
            // Check if we have space
            const wouldBeSize = estimatedCacheSize + dataSize;
            if (wouldBeSize > MAX_CACHE_SIZE) {
              // Try to make space
              pruneCache(MAX_CACHE_SIZE - dataSize);
              
              // If still too big after pruning, skip caching this image
              if (estimatedCacheSize + dataSize > MAX_CACHE_SIZE) {
                console.log(`Skipping cache for ${url} - not enough space even after pruning`);
                resolve(base64data);
                return;
              }
            }
            
            const jsonData = JSON.stringify(cacheData);
            localStorage.setItem(cacheKey, jsonData);
            estimatedCacheSize += jsonData.length * 2;
            debugCache('SET', cacheKey, undefined, dataSize);
          } catch (storageError) {
            console.error(`Failed to store image in cache (quota exceeded): ${url}`, storageError);
            // Run emergency pruning
            pruneCache(MAX_CACHE_SIZE * 0.7);
          }
          
          resolve(base64data);
        } catch (error) {
          console.error(`Error processing cached image: ${url}`, error);
          resolve(url); // Return original URL on error
        }
      };
      reader.onerror = (error) => {
        console.error(`Error reading image as data URL: ${url}`, error);
        reject(url); // Reject with original URL on error
      };
      reader.readAsDataURL(optimizedBlob);
    });
  } catch (error) {
    console.error(`Failed to cache image: ${url}`, error);
    return url; // Fallback to original URL if caching fails
  }
};

export const getCachedImageUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // Already a data URL
  
  try {
    return await cacheImage(url);
  } catch (error) {
    console.error(`Error in getCachedImageUrl: ${url}`, error);
    return url;
  }
};

// Pre-cache images with priority queue and memory monitoring
export const precacheImages = async (urls: string[]): Promise<void> => {
  if (!urls || urls.length === 0) return;
  
  if (import.meta.env.DEV) console.log(`Pre-caching ${urls.length} images`);
  const validUrls = urls.filter(url => url && typeof url === 'string' && !url.startsWith('data:'));
  
  // Process in smaller batches to avoid overloading the browser
  const batchSize = 2; // Smaller batch size
  for (let i = 0; i < validUrls.length; i += batchSize) {
    // Check if we need to clean the cache
    checkCacheSize();
    
    // Only process a small batch at a time
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(url => cacheImage(url)));
    
    // Add a small delay between batches to let browser breathe
    if (i + batchSize < validUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  if (import.meta.env.DEV) console.log(`Pre-caching complete for ${validUrls.length} images`);
};

// Clear expired cache entries
export const cleanupImageCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    let freedSpace = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const cached: CachedImage = JSON.parse(value);
            if (now - cached.timestamp >= IMAGE_CACHE_DURATION) {
              keysToRemove.push(key);
              freedSpace += value.length * 2;
            }
          }
        } catch (error) {
          keysToRemove.push(key);
          const value = localStorage.getItem(key);
          if (value) freedSpace += value.length * 2;
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    estimatedCacheSize -= freedSpace;
    
    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired image cache entries, freed ${(freedSpace / (1024 * 1024)).toFixed(2)}MB`);
    }
  } catch (error) {
    console.error('Error cleaning up image cache:', error);
  }
};

// Monitor available storage space
export const getStorageEstimate = async (): Promise<{ used: number, quota: number }> => {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
  } catch (error) {
    console.error('Error estimating storage:', error);
  }
  return { used: 0, quota: 0 };
};
