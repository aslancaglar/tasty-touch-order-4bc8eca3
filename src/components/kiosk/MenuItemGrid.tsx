
import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { MenuItem } from "@/types/database-types";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  loading?: boolean;
}

const MenuItemGrid = memo(({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  loading
}: MenuItemGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
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
});

MenuItemGrid.displayName = 'MenuItemGrid';

export default MenuItemGrid;
