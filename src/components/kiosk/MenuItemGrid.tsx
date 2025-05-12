import React from 'react';
import { MenuItem, MenuCategory, Restaurant } from '@/types/database-types';
import { SupportedLanguage } from '@/utils/language-utils';

interface MenuItemGridProps {
  items: MenuItem[];
  handleSelectItem: (item: MenuItem) => void;
  currencySymbol: string;
  t: (key: string) => string;
  restaurantId?: string;
  refreshTrigger?: number;
  categories: MenuCategory[];
  uiLanguage: SupportedLanguage;
  colorPalette?: Restaurant['color_palette'];
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  items,
  handleSelectItem,
  currencySymbol,
  t,
  restaurantId,
  refreshTrigger,
  categories,
  uiLanguage,
  colorPalette
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative rounded-lg overflow-hidden shadow-md transition-transform transform hover:scale-105 cursor-pointer"
          onClick={() => handleSelectItem(item)}
          style={{
            backgroundColor: colorPalette?.background,
            color: colorPalette?.text,
          }}
        >
          {item.image && (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-48 object-cover object-center"
            />
          )}
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-xl font-bold">
                {currencySymbol}
                {item.price.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MenuItemGrid;
