
import React, { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ImageOff } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { getCachedImageUrl, precacheImages } from "@/utils/image-cache";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
  refreshTrigger?: number;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId,
  refreshTrigger
}) => {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const isMounted = useRef<boolean>(true);

  // Pre-cache all images when component mounts or items change
  useEffect(() => {
    const imageUrls = items
      .filter(item => item.in_stock && item.image)
      .map(item => item.image || '');
    
    if (imageUrls.length > 0) {
      // Attempt to precache all images
      precacheImages(imageUrls)
        .catch(err => console.error("Error pre-caching images:", err));
    }
  }, [items, refreshTrigger]);

  useEffect(() => {
    isMounted.current = true;
    setLoadingImages(true);
    
    const cacheImages = async () => {
      const inStockItems = items.filter(item => item.in_stock);
      console.log(`Caching images for ${inStockItems.length} menu items`);
      
      try {
        // Process images in smaller batches to be more responsive
        const batchSize = 5;
        const newCachedImages: Record<string, string> = {};
        const newFailedImages = new Set<string>();
        
        for (let i = 0; i < inStockItems.length; i += batchSize) {
          const batch = inStockItems.slice(i, i + batchSize);
          const imagePromises = batch
            .filter(item => item.image)
            .map(async item => {
              try {
                const cachedUrl = await getCachedImageUrl(item.image || '');
                if (!cachedUrl || cachedUrl === item.image) {
                  newFailedImages.add(item.id);
                }
                return { id: item.id, url: cachedUrl || item.image || '' };
              } catch (error) {
                console.error(`Error caching image for item ${item.id}:`, error);
                newFailedImages.add(item.id);
                return { id: item.id, url: item.image || '' };
              }
            });

          const cachedUrls = await Promise.all(imagePromises);
          
          cachedUrls.forEach(({ id, url }) => {
            newCachedImages[id] = url;
          });
          
          // Update state after each batch if component is still mounted
          if (isMounted.current && i + batchSize >= inStockItems.length) {
            setCachedImages(prev => ({ ...prev, ...newCachedImages }));
            setFailedImages(new Set([...failedImages, ...newFailedImages]));
          }
        }
        
        if (isMounted.current) {
          setCachedImages(newCachedImages);
          setFailedImages(newFailedImages);
          setLoadingImages(false);
          console.log(`Finished caching ${Object.keys(newCachedImages).length} images`);
        }
      } catch (error) {
        console.error("Error in image caching process:", error);
        if (isMounted.current) {
          setLoadingImages(false);
        }
      }
    };

    if (items.length > 0) {
      cacheImages();
    } else {
      setLoadingImages(false);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, [items, refreshTrigger]);

  const handleImageError = (itemId: string) => {
    setFailedImages(prev => new Set([...prev, itemId]));
  };

  const getImageUrl = (item: MenuItem): string => {
    return cachedImages[item.id] || item.image || 'https://via.placeholder.com/400x300';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
      {items
        .filter(item => item.in_stock)
        .map(item => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow select-none">
            <div 
              className="h-40 bg-cover bg-center cursor-pointer relative select-none" 
              style={{
                backgroundImage: !failedImages.has(item.id) 
                  ? `url(${getImageUrl(item)})` 
                  : 'none',
                backgroundColor: failedImages.has(item.id) ? '#f0f0f0' : undefined
              }}
              onClick={() => handleSelectItem(item)}
            >
              {failedImages.has(item.id) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <ImageOff className="h-10 w-10 text-gray-400" />
                </div>
              )}
            </div>
            <div className="p-4 select-none">
              <div className="flex justify-between">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="font-bold">{parseFloat(item.price.toString()).toFixed(2)} {currencySymbol}</p>
              </div>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
              <Button 
                onClick={() => handleSelectItem(item)} 
                className="w-full mt-4 bg-kiosk-primary text-xl py-[25px] px-0"
              >
                {t("addToCart")}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        ))}
    </div>
  );
};

export default MenuItemGrid;
