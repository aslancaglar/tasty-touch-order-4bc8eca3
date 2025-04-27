
import { useState, useEffect } from 'react';
import { getMenuForRestaurant } from '@/services/kiosk-service';
import { MenuCategory, MenuItem } from '@/types/database-types';

type CategoryWithItems = MenuCategory & {
  items: MenuItem[];
};

export const useMenu = (restaurantId: string | undefined) => {
  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      
      try {
        setLoading(true);
        const menuData = await getMenuForRestaurant(restaurantId);
        setCategories(menuData);
        
        if (menuData.length > 0) {
          setActiveCategory(menuData[0].id);
        }
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [restaurantId]);

  return {
    categories,
    activeCategory,
    setActiveCategory,
    loading,
    error
  };
};
