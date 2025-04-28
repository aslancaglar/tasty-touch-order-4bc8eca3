
import React, { useState, useEffect } from 'react';
import { cacheImage, getCachedImage } from '@/utils/image-cache';
import { UtensilsCrossed } from 'lucide-react';

interface CachedImageProps {
  src: string;
  alt: string;
  restaurantId: string;
  className?: string;
  fallbackClassName?: string;
  width?: number;
  height?: number;
}

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
        const cachedSrc = await getCachedImage(src);
        
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
