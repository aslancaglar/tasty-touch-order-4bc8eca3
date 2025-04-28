
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { getCachedImageUrl } from "@/utils/image-cache";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items: initialItems,
  handleSelectItem,
  currencySymbol,
  t
}) => {
  const [cachedImages, setCachedImages] = useState<Record<string, string>>({});
  const [items, setItems] = useState<MenuItem[]>(initialItems);

  // Update items when props change
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Subscribe to real-time updates for menu items
  useEffect(() => {
    console.info("Setting up realtime subscription for menu items");
    
    const channel = supabase
      .channel('menu-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          console.info('Menu item changed:', payload);
          
          // Handle different types of changes
          if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as MenuItem;
            
            setItems(prevItems => {
              // Find if this item exists in our current items
              const itemIndex = prevItems.findIndex(item => item.id === updatedItem.id);
              
              if (itemIndex === -1) return prevItems; // Item not in our current view
              
              // Create a new array with the updated item
              const updatedItems = [...prevItems];
              updatedItems[itemIndex] = updatedItem;

              // If stock status changed, show a toast
              if (prevItems[itemIndex].in_stock !== updatedItem.in_stock) {
                toast(
                  updatedItem.in_stock 
                    ? `${updatedItem.name} is now available` 
                    : `${updatedItem.name} is now out of stock`
                );
              }
              
              return updatedItems;
            });
          } 
          // Handle INSERT and DELETE if needed in the future
        }
      )
      .subscribe((status) => {
        console.info("Supabase channel status:", status);
      });
    
    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const cacheImages = async () => {
      const imagePromises = items
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
  }, [items]);

  const inStockItems = items.filter(item => item.in_stock);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {inStockItems.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            layout
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default MenuItemGrid;
