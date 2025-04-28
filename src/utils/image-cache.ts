
const IMAGE_CACHE_PREFIX = 'kiosk_image_cache_';
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedImage {
  blob: string;
  timestamp: number;
}

export const cacheImage = async (url: string): Promise<string> => {
  const cacheKey = `${IMAGE_CACHE_PREFIX}${url}`;
  
  // Check if image is already in cache
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    const cached: CachedImage = JSON.parse(cachedData);
    if (Date.now() - cached.timestamp < IMAGE_CACHE_DURATION) {
      console.log(`Image cache HIT: ${url}`);
      return cached.blob;
    }
    // Remove expired cache
    localStorage.removeItem(cacheKey);
    console.log(`Image cache EXPIRED: ${url}`);
  }

  try {
    // Fetch and cache the image
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const cacheData: CachedImage = {
          blob: base64data,
          timestamp: Date.now()
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`Image cache SET: ${url}`);
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Failed to cache image: ${url}`, error);
    return url; // Fallback to original URL if caching fails
  }
};

export const getCachedImageUrl = async (url: string): Promise<string> => {
  if (!url) return '';
  return cacheImage(url);
};

