
const IMAGE_CACHE_PREFIX = 'kiosk_image_cache_';
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedImage {
  blob: string;
  timestamp: number;
}

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
          console.log(`Image cache HIT: ${url}`);
          return cached.blob;
        }
        // Remove expired cache
        localStorage.removeItem(cacheKey);
        console.log(`Image cache EXPIRED: ${url}`);
      } catch (error) {
        console.error('Error parsing cached image data:', error);
        localStorage.removeItem(cacheKey);
      }
    }

    // Fetch and cache the image
    console.log(`Fetching image: ${url}`);
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
          
          const cacheData: CachedImage = {
            blob: base64data,
            timestamp: Date.now()
          };
          
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`Image cache SET: ${url}`);
          } catch (storageError) {
            console.error(`Failed to store image in cache (possibly quota exceeded): ${url}`, storageError);
            // Continue without caching if storage failed
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
      reader.readAsDataURL(blob);
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

// New function to pre-cache images
export const precacheImages = async (urls: string[]): Promise<void> => {
  if (!urls || urls.length === 0) return;
  
  console.log(`Pre-caching ${urls.length} images`);
  const validUrls = urls.filter(url => url && typeof url === 'string' && !url.startsWith('data:'));
  
  // Process in batches to avoid overloading the browser
  const batchSize = 5;
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(url => cacheImage(url)));
  }
  
  console.log(`Pre-caching complete for ${validUrls.length} images`);
};

// Clear expired cache entries
export const cleanupImageCache = (): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const cached: CachedImage = JSON.parse(value);
            if (now - cached.timestamp >= IMAGE_CACHE_DURATION) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired image cache entries`);
    }
  } catch (error) {
    console.error('Error cleaning up image cache:', error);
  }
};
