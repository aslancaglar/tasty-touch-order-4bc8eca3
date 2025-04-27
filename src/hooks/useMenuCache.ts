
import { useState, useEffect } from 'react';
import { Restaurant, MenuCategory } from '@/types/database-types';
import { getRestaurantBySlug, getMenuForRestaurant } from '@/services/kiosk-service';

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedData {
  restaurant: Restaurant;
  menu: MenuCategory[];
  timestamp: number;
}

export const useMenuCache = (restaurantSlug: string | undefined) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantSlug) {
        setLoading(false);
        return;
      }

      try {
        // Check cache first
        const cachedData = localStorage.getItem(`menu_cache_${restaurantSlug}`);
        if (cachedData) {
          const parsed: CachedData = JSON.parse(cachedData);
          const isExpired = Date.now() - parsed.timestamp > CACHE_EXPIRY;

          if (!isExpired) {
            setRestaurant(parsed.restaurant);
            setCategories(parsed.menu);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data if cache missing or expired
        const restaurantData = await getRestaurantBySlug(restaurantSlug);
        if (!restaurantData) {
          setLoading(false);
          return;
        }

        const menuData = await getMenuForRestaurant(restaurantData.id);
        
        // Update cache
        const cacheData: CachedData = {
          restaurant: restaurantData,
          menu: menuData,
          timestamp: Date.now()
        };
        localStorage.setItem(`menu_cache_${restaurantSlug}`, JSON.stringify(cacheData));

        setRestaurant(restaurantData);
        setCategories(menuData);
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantSlug]);

  return { restaurant, categories, loading };
};
