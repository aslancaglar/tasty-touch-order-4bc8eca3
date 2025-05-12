
import React from 'react';
import { MenuCategory, Restaurant } from '@/types/database-types';
import { Utensils } from 'lucide-react';

interface MenuCategoryListProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  setActiveCategory: (categoryId: string) => void;
  colorPalette?: Restaurant['color_palette'];
}

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({
  categories,
  activeCategory,
  setActiveCategory,
  colorPalette
}) => {
  // Sort categories by display_order
  const sortedCategories = [...categories].sort((a, b) => {
    // If display_order is null/undefined, treat it as highest number (displayed last)
    const orderA = a.display_order ?? 1000;
    const orderB = b.display_order ?? 1000;
    return orderA - orderB;
  });

  // Handle category click - scroll to the category section and update active category
  const handleCategoryClick = (categoryId: string) => {
    // Set active category for highlighting and reordering
    setActiveCategory(categoryId);
    
    // Find the category element and scroll to it
    const categoryElement = document.getElementById(`category-${categoryId}`);
    if (categoryElement) {
      // Add small delay to ensure DOM updates before scrolling
      setTimeout(() => {
        // Position the category title at the very top of the scroll container with proper padding
        const scrollContainer = categoryElement.closest('.overflow-y-auto');
        if (scrollContainer) {
          const headerHeight = document.querySelector('.h-\\[12vh\\]')?.clientHeight || 120;
          // Add extra padding (24px) for consistent spacing with the left navigation
          const offsetPosition = categoryElement.offsetTop - headerHeight - 24;
          scrollContainer.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        } else {
          // Fallback to the old method if scroll container not found
          categoryElement.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
        }
      }, 50);
    }
  };

  const buttonStyle = (isActive: boolean) => {
    if (colorPalette) {
      return isActive 
        ? { backgroundColor: colorPalette.primary, color: colorPalette.background } 
        : { backgroundColor: colorPalette.accent, color: colorPalette.text };
    }
    return {}; // Default styles will be applied through classes
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      <div className="space-y-2">
        {sortedCategories.map(category => (
          <button 
            key={category.id} 
            onClick={() => handleCategoryClick(category.id)} 
            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
              activeCategory === category.id 
                ? 'bg-kiosk-primary text-white' 
                : 'bg-[#D6BCFA] hover:bg-[#E5DEFF] text-gray-800'
            }`}
            style={buttonStyle(activeCategory === category.id)}
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
                  <Utensils className="h-8 w-8" />
                </div>
              )}
            </div>
            <span className="font-bebas uppercase break-words text-lg tracking-wide">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuCategoryList;
