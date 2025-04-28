
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { getCachedImageUrl } from "@/utils/image-cache";
import { supabase } from "@/integrations/supabase/client";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId
}) => {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [localItems, setLocalItems] = useState<MenuItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    const cacheImages = async () => {
      const imagePromises = localItems
        .filter(item => item.in_stock && item.image)
        .map(async item => {
          const cachedUrl = await getCachedImageUrl(item.image || '');
          return { id: item.id, url: cachedUrl };
        });

      const cachedUrls = await Promise.all(imagePromises);
      const newCachedImages = cachedUrls.reduce((acc, { id, url }) => ({
        ...acc,
        [id]: url
      }), {});

      setCachedImages(newCachedImages);
    };

    cacheImages();
  }, [localItems]);

  // Listen for refresh signals if restaurantId is provided
  useEffect(() => {
    if (!restaurantId) return;

    // Subscribe to the refresh signals channel
    const channel = supabase
      .channel('kiosk-refresh')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kiosk_refresh_signals',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Received kiosk refresh signal:', payload);
          // Force reload the window when a refresh signal is received
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localItems
        .filter(item => item.in_stock)
        .map(item => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div 
              className="h-40 bg-cover bg-center cursor-pointer" 
              style={{
                backgroundImage: `url(${cachedImages[item.id] || item.image || 'https://via.placeholder.com/400x300'})`
              }}
              onClick={() => handleSelectItem(item)}
            ></div>
            <div className="p-4">
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
