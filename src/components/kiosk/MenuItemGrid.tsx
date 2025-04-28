
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { getCachedImageUrl } from "@/utils/image-cache";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t
}) => {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [localItems, setLocalItems] = useState<MenuItem[]>(items);
  const { toast } = useToast();

  // Initialize localItems when items prop changes
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Cache images for performance
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

  // Set up real-time subscription to menu items
  useEffect(() => {
    console.log("Setting up real-time subscription for menu items", 
      items.map(item => item.id)
    );
    
    // Create a proper filter condition with a valid IN clause
    const itemIds = items.map(item => item.id);
    
    // Only set up subscription if we have items
    if (itemIds.length === 0) {
      return;
    }
    
    const channel = supabase
      .channel('menu-items-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
          filter: `id=in.(${itemIds.map(id => `'${id}'`).join(',')})`,
        },
        (payload) => {
          console.log("Received update for menu item:", payload);
          const updatedItem = payload.new as MenuItem;
          
          // Find the item in the current local state
          const existingItem = localItems.find(item => item.id === updatedItem.id);
          
          // If stock status changed, show toast and update local state
          if (existingItem && existingItem.in_stock !== updatedItem.in_stock) {
            if (updatedItem.in_stock) {
              toast({
                title: "Item Available",
                description: `${updatedItem.name} is now available!`,
                variant: "default"
              });
            } else {
              toast({
                title: "Item Unavailable",
                description: `${updatedItem.name} is no longer available.`,
                variant: "destructive"
              });
            }

            setLocalItems(prevItems => 
              prevItems.map(item => 
                item.id === updatedItem.id ? updatedItem : item
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    // Cleanup subscription on component unmount
    return () => {
      console.log("Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [items, toast]); // Remove localItems from dependency to avoid re-subscribing

  // Filter in-stock items at render time
  const inStockItems = localItems.filter(item => item.in_stock);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {inStockItems.map(item => (
        <Card 
          key={item.id} 
          className="overflow-hidden hover:shadow-md transition-shadow animate-fade-in"
        >
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
