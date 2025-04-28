
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { cacheKeys, getCache, setCache } from "@/utils/cache-utils";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId: string;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId
}) => {
  React.useEffect(() => {
    if (items?.length > 0 && restaurantId) {
      setCache(cacheKeys.menuItems(restaurantId), items);
    }
  }, [items, restaurantId]);

  // If no items or null, show a placeholder message
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t("No items available in this category")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items
        .filter(item => item.in_stock)
        .map(item => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div 
              className="h-40 bg-cover bg-center cursor-pointer" 
              style={{
                backgroundImage: `url(${item.image || 'https://via.placeholder.com/400x300'})`
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
