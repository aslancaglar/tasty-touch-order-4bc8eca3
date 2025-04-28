
import React from "react";
import { UtensilsCrossed } from "lucide-react";
import { MenuCategory } from "@/types/database-types";
import { cacheKeys, getCache, setCache } from "@/utils/cache-utils";

interface MenuCategoryListProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  setActiveCategory: (categoryId: string) => void;
  restaurantId: string;
}

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  restaurantId
}) => {
  React.useEffect(() => {
    if (categories.length > 0 && restaurantId) {
      setCache(cacheKeys.categories(restaurantId), categories);
    }
  }, [categories, restaurantId]);

  return (
    <div className="p-4">
      <div className="space-y-2">
        {categories.map(category => (
          <button 
            key={category.id} 
            onClick={() => setActiveCategory(category.id)} 
            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
              activeCategory === category.id 
                ? 'bg-kiosk-primary text-white' 
                : 'bg-[#D6BCFA] hover:bg-[#E5DEFF] text-gray-800'
            }`}
          >
            <div className="mr-3 w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              {category.icon ? (
                <img 
                  src={category.icon} 
                  alt={category.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${
                  activeCategory === category.id ? 'text-white' : 'text-gray-500'
                }`}>
                  <UtensilsCrossed className="h-8 w-8" />
                </div>
              )}
            </div>
            <span className="font-bold uppercase">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuCategoryList;
