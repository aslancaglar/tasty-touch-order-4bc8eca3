import React, { useEffect, useState, useRef, memo, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ImageOff, Clock } from "lucide-react";
import { MenuItem, MenuCategory } from "@/types/database-types";
import { getCachedImageUrl, precacheImages, getStorageEstimate } from "@/utils/image-cache";
import { getTranslation, SupportedLanguage } from "@/utils/language-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
  refreshTrigger?: number;
  categories: MenuCategory[];
  activeCategory?: string;
  uiLanguage: SupportedLanguage;
}

// Function to check if a menu item is available based on time constraints
const isItemAvailable = (item: MenuItem): boolean => {
  if (!item.available_from || !item.available_until) {
    return true; // If no time constraint is set, the item is always available
  }
  const currentDate = new Date();
  const currentTime = currentDate.getHours() * 60 + currentDate.getMinutes(); // Convert to minutes since midnight

  // Parse HH:MM:SS format to minutes since midnight
  const parseTimeToMinutes = (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const fromMinutes = parseTimeToMinutes(item.available_from);
  const untilMinutes = parseTimeToMinutes(item.available_until);

  // Handle cases where availability crosses midnight
  if (fromMinutes <= untilMinutes) {
    // Regular time range (e.g., 11:00 to 14:00)
    return currentTime >= fromMinutes && currentTime <= untilMinutes;
  } else {
    // Time range spans midnight (e.g., 22:00 to 02:00)
    return currentTime >= fromMinutes || currentTime <= untilMinutes;
  }
};

// Format time for display
const formatTime = (timeString: string | null): string => {
  if (!timeString) return '';
  return timeString.substring(0, 5); // Extract HH:MM from HH:MM:SS
};

// Calculate promotion percentage
const calculatePromotionPercentage = (originalPrice: number, promotionPrice: number): number => {
  if (!originalPrice || !promotionPrice || originalPrice <= 0 || promotionPrice >= originalPrice) {
    return 0;
  }
  const reduction = (originalPrice - promotionPrice) / originalPrice * 100;
  return Math.round(reduction);
};

// Individual menu item component, memoized to prevent re-renders
const MenuItemCard = memo(({
  item,
  handleSelectItem,
  t,
  currencySymbol,
  cachedImageUrl,
  hasImageFailed,
  uiLanguage,
  currentAvailabilityStatus
}: {
  item: MenuItem;
  handleSelectItem: (item: MenuItem) => void;
  t: (key: string) => string;
  currencySymbol: string;
  cachedImageUrl: string;
  hasImageFailed: boolean;
  uiLanguage: SupportedLanguage;
  currentAvailabilityStatus: boolean;
}) => {
  const handleItemClick = useCallback(() => {
    if (currentAvailabilityStatus) {
      handleSelectItem(item);
    }
  }, [item, handleSelectItem, currentAvailabilityStatus]);
  const formattedPrice = useMemo(() => {
    return parseFloat(item.price.toString()).toFixed(2);
  }, [item.price]);
  const formattedPromotionPrice = useMemo(() => {
    return item.promotion_price ? parseFloat(item.promotion_price.toString()).toFixed(2) : null;
  }, [item.promotion_price]);
  const promotionPercentage = useMemo(() => {
    if (!item.promotion_price) return 0;
    return calculatePromotionPercentage(parseFloat(item.price.toString()), parseFloat(item.promotion_price.toString()));
  }, [item.price, item.promotion_price]);
  const unavailableText = getTranslation('menuItem.unavailable', uiLanguage);
  const hasPromotion = item.promotion_price && parseFloat(item.promotion_price.toString()) > 0 && parseFloat(item.promotion_price.toString()) < parseFloat(item.price.toString());
  return <Card className={`overflow-hidden hover:shadow-md transition-shadow select-none ${currentAvailabilityStatus ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={handleItemClick}>
      <div className="h-40 bg-cover bg-center relative select-none" style={{
      backgroundImage: !hasImageFailed ? `url(${cachedImageUrl})` : 'none',
      backgroundColor: hasImageFailed ? '#f0f0f0' : undefined
    }}>
        {hasImageFailed && <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <ImageOff className="h-10 w-10 text-gray-400" />
          </div>}
        {item.available_from && item.available_until && <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(item.available_from)} - {formatTime(item.available_until)}
          </div>}
          
        {hasPromotion && promotionPercentage > 0 && <div className="absolute top-2 left-2 bg-red-500 text-white w-14 h-14 rounded-full flex items-center justify-center font-bebas text-xl">
            -{promotionPercentage}%
          </div>}
      </div>
      <div className="p-4 select-none">
        <div className="flex justify-between">
          <h3 className="font-bebas text-lg tracking-wide break-words">{item.name}</h3>
          <div className="flex flex-col items-end ml-2">
            {hasPromotion ? <>
                <p className="font-bebas text-lg whitespace-nowrap text-black">{formattedPromotionPrice} {currencySymbol}</p>
                <p className="font-inter text-xs text-gray-500 line-through whitespace-nowrap">{formattedPrice} {currencySymbol}</p>
              </> : <p className="font-bebas text-lg whitespace-nowrap">{formattedPrice} {currencySymbol}</p>}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2 font-inter">{item.description}</p>
        {currentAvailabilityStatus ? <Button className="w-full mt-4 bg-kiosk-primary text-xl py-[25px] px-0 font-bebas tracking-wide">
            {t("addToCart")}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button> : <div className="w-full mt-4 px-0 text-center text-white font-bebas tracking-wide text-xl py-[10px] bg-red-400 rounded-md">
            {unavailableText}
          </div>}
      </div>
    </Card>;
});
MenuItemCard.displayName = 'MenuItemCard';
const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId,
  refreshTrigger,
  categories,
  activeCategory,
  uiLanguage
}) => {
  const {
    toast
  } = useToast();
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<boolean>(true);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [itemAvailability, setItemAvailability] = useState<Record<string, boolean>>({});
  const isMounted = useRef<boolean>(true);
  const visibleItemsRef = useRef<Set<string>>(new Set());
  const imagePreloadQueue = useRef<string[]>([]);
  const isPreloadingRef = useRef<boolean>(false);
  const availabilityTimerRef = useRef<number | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    // Create an object to hold items grouped by their category
    const grouped: Record<string, MenuItem[]> = {};

    // Initialize all categories with empty arrays
    categories.forEach(category => {
      grouped[category.id] = [];
    });

    // Add all in-stock items to their respective category groups
    items.filter(item => item.in_stock).forEach(item => {
      if (grouped[item.category_id]) {
        grouped[item.category_id].push(item);
      }
    });

    // Sort items by display_order within each category
    Object.keys(grouped).forEach(categoryId => {
      grouped[categoryId].sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
    });
    return grouped;
  }, [items, categories]);

  // Sort categories by putting the active category first, then by display_order
  const sortedCategories = useMemo(() => {
    let categoriesCopy = [...categories];

    // Sort by display_order first
    categoriesCopy.sort((a, b) => {
      const orderA = a.display_order ?? 1000;
      const orderB = b.display_order ?? 1000;
      return orderA - orderB;
    });

    // If there's an active category, move it to the top
    if (activeCategory) {
      categoriesCopy = categoriesCopy.sort((a, b) => {
        if (a.id === activeCategory) return -1;
        if (b.id === activeCategory) return 1;
        return 0;
      });
    }
    return categoriesCopy;
  }, [categories, activeCategory]);

  // Initialize item availability state
  const initializeAvailability = useCallback(() => {
    const currentAvailability: Record<string, boolean> = {};
    items.forEach(item => {
      currentAvailability[item.id] = isItemAvailable(item);
    });
    setItemAvailability(currentAvailability);
    console.log("[MenuItemGrid] Initialized availability for", items.length, "items");
  }, [items]);

  // Check item availability every minute and update the state
  const updateAvailability = useCallback(() => {
    let hasChanges = false;
    const newAvailability = {
      ...itemAvailability
    };
    items.forEach(item => {
      const newStatus = isItemAvailable(item);
      if (newAvailability[item.id] !== newStatus) {
        newAvailability[item.id] = newStatus;
        hasChanges = true;
        console.log(`[MenuItemGrid] Item ${item.name} availability changed to ${newStatus ? 'available' : 'unavailable'}`);
      }
    });
    if (hasChanges) {
      console.log("[MenuItemGrid] Updating availability state after time-based changes");
      setItemAvailability(newAvailability);
    }
  }, [items, itemAvailability]);

  // Setup realtime subscription for menu items changes
  const setupRealtimeSubscription = useCallback(() => {
    if (!restaurantId) return;

    // Clean up existing subscription if any
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
    }
    try {
      console.log("[MenuItemGrid] Setting up realtime subscription for menu items");
      const channel = supabase.channel('menu-items-changes').on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'menu_items',
        filter: `category_id=in.(${categories.map(c => `'${c.id}'`).join(',')})`
      }, payload => {
        console.log("[MenuItemGrid] Received realtime update for menu item:", payload);

        // Get the updated item from the payload
        const updatedItem = payload.new as MenuItem;
        if (!updatedItem) return;

        // Update the availability state for this specific item
        setItemAvailability(prev => ({
          ...prev,
          [updatedItem.id]: isItemAvailable(updatedItem)
        }));

        // Toast notification for debugging
        toast({
          title: "Menu item updated",
          description: `${updatedItem.name} availability updated`,
          duration: 3000
        });
      }).subscribe(status => {
        console.log("[MenuItemGrid] Realtime subscription status:", status);
      });

      // Save the channel reference for cleanup
      realtimeChannelRef.current = channel;
    } catch (error) {
      console.error("[MenuItemGrid] Error setting up realtime subscription:", error);
    }
  }, [restaurantId, categories, toast]);

  // Pre-cache only visible items with intersection observer
  const setupIntersectionObserver = useCallback(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const itemId = entry.target.getAttribute('data-item-id');
        if (!itemId) return;
        if (entry.isIntersecting) {
          // Item is visible, add to visible items set
          visibleItemsRef.current.add(itemId);

          // Get the image URL for this item
          const item = items.find(i => i.id === itemId);
          if (item?.image && !item.image.startsWith('data:') && !cachedImages[itemId]) {
            // Add to preload queue if not already cached
            if (!imagePreloadQueue.current.includes(item.image)) {
              imagePreloadQueue.current.push(item.image);
              processImageQueue();
            }
          }
        } else {
          // Item is no longer visible
          visibleItemsRef.current.delete(itemId);
        }
      });
    }, {
      rootMargin: '100px',
      // Start loading when item is 100px from viewport
      threshold: 0.1 // Trigger when at least 10% of the item is visible
    });

    // Observe all menu item elements
    setTimeout(() => {
      document.querySelectorAll('[data-item-id]').forEach(element => {
        observer.observe(element);
      });
    }, 100);
    return observer;
  }, [items, cachedImages]);

  // Process image queue one at a time
  const processImageQueue = useCallback(async () => {
    if (isPreloadingRef.current || imagePreloadQueue.current.length === 0) return;
    isPreloadingRef.current = true;
    const url = imagePreloadQueue.current.shift();
    if (url) {
      try {
        const cachedUrl = await getCachedImageUrl(url);

        // Find the item that uses this image
        if (isMounted.current) {
          setCachedImages(prev => {
            const itemsWithImage = items.filter(item => item.image === url);
            if (itemsWithImage.length === 0) return prev;
            const updates: Record<string, string> = {};
            itemsWithImage.forEach(item => {
              updates[item.id] = cachedUrl;
            });
            return {
              ...prev,
              ...updates
            };
          });
        }
      } catch (err) {
        console.error(`Error caching image: ${url}`, err);
      }
    }
    isPreloadingRef.current = false;

    // Process next image after a small delay
    if (imagePreloadQueue.current.length > 0) {
      setTimeout(processImageQueue, 50);
    }
  }, [items]);

  // Initialize availability on mount and when items change
  useEffect(() => {
    initializeAvailability();
  }, [items, initializeAvailability]);

  // Setup timer to check availability every minute
  useEffect(() => {
    // Initial check
    updateAvailability();

    // Calculate seconds until the next full minute
    const now = new Date();
    const secondsToNextMinute = 60 - now.getSeconds();

    // Wait until the next full minute, then start checking every minute
    const initialTimeout = setTimeout(() => {
      updateAvailability();

      // Start the interval at exactly the beginning of a minute
      const intervalId = setInterval(() => {
        updateAvailability();
      }, 60000); // Check every minute

      availabilityTimerRef.current = intervalId as unknown as number;
    }, secondsToNextMinute * 1000);
    return () => {
      clearTimeout(initialTimeout);
      if (availabilityTimerRef.current) {
        clearInterval(availabilityTimerRef.current);
      }
    };
  }, [updateAvailability]);

  // Setup realtime subscription
  useEffect(() => {
    if (restaurantId) {
      setupRealtimeSubscription();
    }
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [restaurantId, setupRealtimeSubscription]);

  // Effect to initialize intersection observer
  useEffect(() => {
    const observer = setupIntersectionObserver();
    return () => {
      if (observer) observer.disconnect();
    };
  }, [setupIntersectionObserver]);

  // Pre-cache all images when component mounts or items change
  useEffect(() => {
    const imageUrls = items.filter(item => item.image).map(item => item.image || '').slice(0, 10); // Limit initial preload to first 10 images

    if (imageUrls.length > 0) {
      // Attempt to precache the first few images
      precacheImages(imageUrls).catch(err => console.error("Error pre-caching images:", err));
    }
  }, [items, refreshTrigger]);
  useEffect(() => {
    isMounted.current = true;
    setLoadingImages(true);
    const cacheImages = async () => {
      if (items.length === 0) {
        setLoadingImages(false);
        return;
      }
      console.log(`Caching images for ${items.length} menu items`);
      try {
        // Get storage information
        const storageInfo = await getStorageEstimate();
        const usedPercent = storageInfo.used / storageInfo.quota * 100;
        console.log(`Storage usage: ${(storageInfo.used / (1024 * 1024)).toFixed(2)}MB / ${(storageInfo.quota / (1024 * 1024)).toFixed(2)}MB (${usedPercent.toFixed(1)}%)`);

        // Process first batch of images synchronously for initial display
        const initialBatch = items.slice(0, 5);
        const newCachedImages: Record<string, string> = {};
        const newFailedImages = new Set<string>();
        for (const item of initialBatch) {
          if (!item.image) continue;
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
        }
        if (isMounted.current) {
          setCachedImages(prev => ({
            ...prev,
            ...newCachedImages
          }));
          setFailedImages(new Set([...failedImages, ...newFailedImages]));
          setLoadingImages(false);
        }

        // Queue remaining images to be loaded in background
        const remainingItems = items.slice(5);
        const remainingUrls = remainingItems.filter(item => item.image).map(item => item.image || '');
        imagePreloadQueue.current = [...remainingUrls];
        processImageQueue();
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
      imagePreloadQueue.current = [];
    };
  }, [items, refreshTrigger]);
  const handleImageError = useCallback((itemId: string) => {
    setFailedImages(prev => new Set([...prev, itemId]));
  }, []);
  return <div className="space-y-8 pb-20">
      {sortedCategories.map(category => <div key={category.id} id={`category-${category.id}`} className="scroll-mt-20 pt-0 py-0">
          <h2 className="text-2xl font-bebas mb-4 border-b pb-2 tracking-wide pl-4">
            {category.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 select-none px-4">
            {itemsByCategory[category.id]?.map(item => <div key={item.id} data-item-id={item.id}>
                <MenuItemCard item={item} handleSelectItem={handleSelectItem} t={t} currencySymbol={currencySymbol} cachedImageUrl={cachedImages[item.id] || item.image || 'https://via.placeholder.com/400x300'} hasImageFailed={failedImages.has(item.id)} uiLanguage={uiLanguage} currentAvailabilityStatus={itemAvailability[item.id] ?? isItemAvailable(item)} />
              </div>)}
            {itemsByCategory[category.id]?.length === 0 && <div className="col-span-3 py-8 text-center text-gray-500 font-inter">
                No items in this category
              </div>}
          </div>
        </div>)}
    </div>;
};
export default memo(MenuItemGrid);