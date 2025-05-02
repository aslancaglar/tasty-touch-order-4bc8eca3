
import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ImageOff } from "lucide-react";
import { MenuItem, MenuCategory } from "@/types/database-types";
import { getCachedImageUrl, precacheImages, getStorageEstimate } from "@/utils/image-cache";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AllCategoriesMenuProps {
  categories: MenuCategory[];
  items: Record<string, MenuItem[]>;
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
  refreshTrigger?: number;
  activeCategory: string | null;
}

// Individual menu item component, memoized to prevent re-renders
const MenuItemCard = memo(({
  item,
  handleSelectItem,
  t,
  currencySymbol,
  cachedImageUrl,
  hasImageFailed
}: {
  item: MenuItem,
  handleSelectItem: (item: MenuItem) => void,
  t: (key: string) => string,
  currencySymbol: string,
  cachedImageUrl: string,
  hasImageFailed: boolean
}) => {
  const handleItemClick = useCallback(() => {
    handleSelectItem(item);
  }, [item, handleSelectItem]);

  const formattedPrice = useMemo(() => {
    return parseFloat(item.price.toString()).toFixed(2);
  }, [item.price]);

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow select-none cursor-pointer" 
      onClick={handleItemClick}
    >
      <div 
        className="h-40 bg-cover bg-center relative select-none" 
        style={{
          backgroundImage: !hasImageFailed ? `url(${cachedImageUrl})` : 'none',
          backgroundColor: hasImageFailed ? '#f0f0f0' : undefined
        }}
      >
        {hasImageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <ImageOff className="h-10 w-10 text-gray-400" />
          </div>
        )}
      </div>
      <div className="p-4 select-none">
        <div className="flex justify-between">
          <h3 className="font-bold text-lg truncate">{item.name}</h3>
          <p className="font-bold whitespace-nowrap">{formattedPrice} {currencySymbol}</p>
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
        <Button 
          className="w-full mt-4 bg-kiosk-primary text-xl py-[25px] px-0"
        >
          {t("addToCart")}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
});

MenuItemCard.displayName = 'MenuItemCard';

const MenuItemGrid: React.FC<AllCategoriesMenuProps> = ({
  categories,
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId,
  refreshTrigger,
  activeCategory
}) => {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const isMounted = useRef<boolean>(true);
  const visibleItemsRef = useRef<Set<string>>(new Set());
  const imagePreloadQueue = useRef<string[]>([]);
  const isPreloadingRef = useRef<boolean>(false);
  const batchProcessingTimer = useRef<number | null>(null);
  
  // Process image queue in batches for better performance
  const processImageQueue = useCallback(async () => {
    if (isPreloadingRef.current || imagePreloadQueue.current.length === 0) return;
    
    isPreloadingRef.current = true;
    
    // Process a batch of images (up to 3 at a time)
    const batchSize = Math.min(3, imagePreloadQueue.current.length);
    const batch = imagePreloadQueue.current.splice(0, batchSize);
    const updates: Record<string, string> = {};
    
    await Promise.all(batch.map(async (url) => {
      try {
        const cachedUrl = await getCachedImageUrl(url);
        
        if (isMounted.current) {
          // Find items that use this image
          const allItems = Object.values(items).flat();
          const itemsWithImage = allItems.filter(item => item.image === url);
          
          itemsWithImage.forEach(item => {
            updates[item.id] = cachedUrl;
          });
        }
      } catch (err) {
        console.error(`Error caching image: ${url}`, err);
      }
    }));
    
    if (isMounted.current && Object.keys(updates).length > 0) {
      setCachedImages(prev => ({ ...prev, ...updates }));
    }
    
    isPreloadingRef.current = false;
    
    // Process next batch after a small delay
    if (imagePreloadQueue.current.length > 0) {
      if (batchProcessingTimer.current) {
        window.clearTimeout(batchProcessingTimer.current);
      }
      
      batchProcessingTimer.current = window.setTimeout(processImageQueue, 10);
    }
  }, [items]);

  // Effect to initialize intersection observer
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    
    const observer = new IntersectionObserver((entries) => {
      const newlyVisibleItems: string[] = [];
      
      entries.forEach(entry => {
        const itemId = entry.target.getAttribute('data-item-id');
        if (!itemId) return;
        
        if (entry.isIntersecting) {
          // Item is visible, add to visible items set
          visibleItemsRef.current.add(itemId);
          
          // Find which category this item belongs to
          let itemToCache: MenuItem | undefined;
          Object.values(items).forEach(categoryItems => {
            const found = categoryItems.find(i => i.id === itemId);
            if (found) itemToCache = found;
          });

          if (itemToCache?.image && 
              !itemToCache.image.startsWith('data:') && 
              !cachedImages[itemId] && 
              !imagePreloadQueue.current.includes(itemToCache.image)) {
            // Add to preload queue if not already cached
            imagePreloadQueue.current.push(itemToCache.image);
            newlyVisibleItems.push(itemId);
          }
        } else {
          // Item is no longer visible
          visibleItemsRef.current.delete(itemId);
        }
      });
      
      // If new items are visible, start processing the image queue
      if (newlyVisibleItems.length > 0) {
        processImageQueue();
      }
    }, {
      rootMargin: '200px', // Increased from 100px to 200px for earlier loading
      threshold: 0.1 // Trigger when at least 10% of the item is visible
    });
    
    // Observe all menu item elements
    const observeElements = () => {
      document.querySelectorAll('[data-item-id]').forEach(element => {
        observer.observe(element);
      });
    };
    
    // Use a shorter timeout to attach observer faster
    const timer = setTimeout(observeElements, 50);
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [categories, items, cachedImages, processImageQueue]);

  // Pre-cache all images when component mounts or items change
  useEffect(() => {
    const allItems = Object.values(items).flat();
    const imageUrls = allItems
      .filter(item => item.image)
      .map(item => item.image || '')
      .slice(0, 15); // Increased from 10 to 15 for faster initial loading
    
    if (imageUrls.length > 0) {
      // Attempt to precache the first batch of images
      precacheImages(imageUrls)
        .catch(err => console.error("Error pre-caching images:", err));
    }
  }, [items, refreshTrigger]);

  // Optimize the image caching process
  useEffect(() => {
    isMounted.current = true;
    setLoadingImages(true);
    
    const cacheImages = async () => {
      const allItems = Object.values(items).flat();
      if (allItems.length === 0) {
        setLoadingImages(false);
        return;
      }
      
      try {
        // Process first batch of images in parallel for initial display
        const initialBatch = allItems.slice(0, 8); // Increased from 5 to 8
        const newCachedImages: Record<string, string> = {};
        const newFailedImages = new Set<string>();
        
        await Promise.all(initialBatch.map(async (item) => {
          if (!item.image) return;
          
          try {
            const cachedUrl = await getCachedImageUrl(item.image);
            if (!cachedUrl || cachedUrl === item.image) {
              newFailedImages.add(item.id);
            }
            newCachedImages[item.id] = cachedUrl || item.image || '';
          } catch (error) {
            console.error(`Error caching image for item ${item.id}:`, error);
            newFailedImages.add(item.id);
            newCachedImages[item.id] = item.image || '';
          }
        }));
        
        if (isMounted.current) {
          setCachedImages(prev => ({ ...prev, ...newCachedImages }));
          setFailedImages(new Set([...failedImages, ...newFailedImages]));
          setLoadingImages(false);
        }
        
        // Queue remaining images to be loaded in background
        const remainingItems = allItems.slice(8);
        const remainingUrls = remainingItems
          .filter(item => item.image)
          .map(item => item.image || '');
        
        // Prioritize items from the active category
        if (activeCategory) {
          const activeItems = items[activeCategory] || [];
          const activeItemUrls = activeItems
            .filter(item => item.image)
            .map(item => item.image || '');
          
          // Move active category items to the front of the queue
          imagePreloadQueue.current = [
            ...activeItemUrls, 
            ...remainingUrls.filter(url => !activeItemUrls.includes(url))
          ];
        } else {
          imagePreloadQueue.current = [...remainingUrls];
        }
        
        processImageQueue();
      } catch (error) {
        console.error("Error in image caching process:", error);
        if (isMounted.current) {
          setLoadingImages(false);
        }
      }
    };

    if (Object.values(items).flat().length > 0) {
      cacheImages();
    } else {
      setLoadingImages(false);
    }

    // Cleanup function
    return () => {
      isMounted.current = false;
      imagePreloadQueue.current = [];
      if (batchProcessingTimer.current) {
        window.clearTimeout(batchProcessingTimer.current);
      }
    };
  }, [items, refreshTrigger, processImageQueue, failedImages, activeCategory]);

  // Sort categories by display_order
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });
  }, [categories]);

  // Pre-compute sorted items for each category
  const sortedItemsByCategory = useMemo(() => {
    const result: Record<string, MenuItem[]> = {};
    
    Object.entries(items).forEach(([categoryId, categoryItems]) => {
      result[categoryId] = [...categoryItems]
        .filter(item => item.in_stock)
        .sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
    });
    
    return result;
  }, [items]);

  // Helper to render items for a category
  const renderCategoryItems = useCallback((categoryId: string) => {
    const sortedItems = sortedItemsByCategory[categoryId] || [];

    if (sortedItems.length === 0) {
      return (
        <div className="text-center py-8 bg-muted/10 rounded-lg">
          <p className="text-muted-foreground">No items available in this category</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none">
        {sortedItems.map(item => (
          <div key={item.id} data-item-id={item.id}>
            <MenuItemCard
              item={item}
              handleSelectItem={handleSelectItem}
              t={t}
              currencySymbol={currencySymbol}
              cachedImageUrl={cachedImages[item.id] || item.image || 'https://via.placeholder.com/400x300'}
              hasImageFailed={failedImages.has(item.id)}
            />
          </div>
        ))}
      </div>
    );
  }, [sortedItemsByCategory, handleSelectItem, t, currencySymbol, cachedImages, failedImages]);

  return (
    <ScrollArea className="flex-1 h-full w-full">
      <div className="pb-[120px] p-4 space-y-10">
        {sortedCategories.map((category) => (
          <div 
            key={category.id} 
            id={`category-${category.id}`} 
            className="scroll-mt-24"
            data-category-id={category.id}
          >
            <h2 className={`text-2xl font-bold mb-6 pb-2 border-b ${activeCategory === category.id ? 'text-kiosk-primary' : ''}`}>
              {category.name}
            </h2>
            {renderCategoryItems(category.id)}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default memo(MenuItemGrid);
