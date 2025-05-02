
import React, { useMemo } from "react";
import MenuCategoryList from "@/components/kiosk/MenuCategoryList";
import MenuItemGrid from "@/components/kiosk/MenuItemGrid";
import { MenuCategory, MenuItem } from "@/types/database-types";

interface KioskMenuProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  setActiveCategory: (categoryId: string) => void;
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
  refreshTrigger: number;
}

const KioskMenu: React.FC<KioskMenuProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId,
  refreshTrigger
}) => {
  // Group items by category for the menu view
  const itemsByCategory = useMemo(() => {
    const result: Record<string, MenuItem[]> = {};
    
    // For each category, retrieve its items from MenuItemGrid
    // Since MenuCategory type doesn't have items property, we initialize with empty array
    categories.forEach(category => {
      result[category.id] = []; // Initialize with empty array, will be populated in MenuItemGrid
    });
    return result;
  }, [categories]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Fixed width sidebar - 16vw */}
      <div className="w-64 min-w-[220px] max-w-[280px] bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
        <MenuCategoryList 
          categories={categories} 
          activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} 
        />
      </div>

      {/* Scrollable menu grid area with all categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="pb-[120px] p-4">
          <MenuItemGrid 
            categories={categories} 
            items={itemsByCategory} 
            handleSelectItem={handleSelectItem} 
            currencySymbol={currencySymbol} 
            t={t} 
            restaurantId={restaurantId} 
            refreshTrigger={refreshTrigger} 
            activeCategory={activeCategory} 
          />
        </div>
      </div>
    </div>
  );
};

export default KioskMenu;
