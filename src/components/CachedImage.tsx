
import React, { useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { saveImageToCache, getImageFromCache } from '@/utils/image-cache';

interface CachedImageProps {
  src: string;
  alt: string;
  restaurantId: string;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
}

// Helper function to cache image from URL - implementation within component file
const cacheImage = async (url: string, restaurantId: string): Promise<void> => {
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

// Helper function to get cached image by URL - implementation within component file
const getCachedImage = async (url: string, restaurantId: string): Promise<string | null> => {
  try {
    // Skip if URL is empty or not a valid URL
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Generate a simple hash as ID from the URL
    const id = url.split('/').pop() || url;
    
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

const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  restaurantId,
  className = '',
  fallbackClassName = '',
  width,
  height
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchImage = async () => {
      // Reset states when src changes
      if (isMounted) {
        setLoading(true);
        setError(false);
      }
      
      // Skip empty sources or data URLs
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) {
        setImageSrc(src);
        setLoading(false);
        return;
      }
      
      try {
        // Try to get from cache first
        const cachedSrc = await getCachedImage(src, restaurantId);
        
        if (cachedSrc && isMounted) {
          setImageSrc(cachedSrc);
          setLoading(false);
        } else {
          // If not in cache, use original source and cache it
          setImageSrc(src);
          setLoading(false);
          
          // Cache for future use
          cacheImage(src, restaurantId);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
    };
  }, [src, restaurantId]);

  const handleError = () => {
    setError(true);
  };
  
  if (error || !src) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${fallbackClassName}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
      >
        <UtensilsCrossed className="h-8 w-8 text-gray-400" />
      </div>
    );
  }
  
  return (
    <>
      {loading && (
        <div 
          className={`bg-gray-100 animate-pulse ${fallbackClassName}`}
          style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
        />
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${loading ? 'hidden' : ''}`}
        onError={handleError}
        width={width}
        height={height}
      />
    </>
  );
};

export default CachedImage;
