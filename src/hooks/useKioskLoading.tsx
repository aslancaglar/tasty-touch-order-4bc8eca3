
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getRestaurantBySlug, getMenuForRestaurant } from '@/services/kiosk-service';
import { Restaurant, MenuCategory } from '@/types/database-types';
import { setCacheItem } from '@/services/cache-service';

interface UseKioskLoadingProps {
  t: (key: string) => string;
  restaurantSlug: string | undefined;
  setActiveCategory: (categoryId: string | null) => void;
  setUiLanguage: (lang: "fr" | "en" | "tr") => void;
}

export const useKioskLoading = ({
  t,
  restaurantSlug,
  setActiveCategory,
  setUiLanguage
}: UseKioskLoadingProps) => {
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      if (!restaurant) return;
      
      const menuData = await getMenuForRestaurant(restaurant.id);
      
      // Sort the menuData before setting state or caching
      const sortedMenuData = [...menuData].sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
      
      // Also sort items within each category
      sortedMenuData.forEach(category => {
        category.items = [...category.items].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
      });
      
      setCategories(sortedMenuData);
      setCacheItem('categories', sortedMenuData, restaurant.id);
      
      if (sortedMenuData.length > 0) {
        setActiveCategory(sortedMenuData[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: t("restaurantNotFound"),
        description: t("sorryNotFound"),
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [restaurant, setActiveCategory, toast, t]);

  const handleRefreshMenu = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
      
      if (!restaurant) return;
      
      const menuData = await getMenuForRestaurant(restaurant.id);
      
      // Sort the menuData before setting state or caching
      const sortedMenuData = [...menuData].sort((a, b) => {
        const orderA = a.display_order ?? 1000;
        const orderB = b.display_order ?? 1000;
        return orderA - orderB;
      });
      
      // Also sort items within each category
      sortedMenuData.forEach(category => {
        category.items = [...category.items].sort((a, b) => {
          const orderA = a.display_order ?? 1000;
          const orderB = b.display_order ?? 1000;
          return orderA - orderB;
        });
      });
      
      setCategories(sortedMenuData);
      
      if (sortedMenuData.length > 0) {
        setActiveCategory(sortedMenuData[0].id);
      }
      
      setCacheItem('categories', sortedMenuData, restaurant.id);
      
      toast({
        title: t("menuRefreshed"),
        description: t("menuRefreshSuccess")
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error refreshing menu:", error);
      toast({
        title: "Error",
        description: "Failed to refresh menu",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [restaurant, setActiveCategory, toast, t]);

  const loadRestaurantAndMenu = useCallback(async () => {
    if (!restaurantSlug) {
      navigate('/');
      return;
    }
    
    try {
      setLoading(true);
      const restaurantData = await getRestaurantBySlug(restaurantSlug);
      
      if (!restaurantData) {
        toast({
          title: t("restaurantNotFound"),
          description: t("sorryNotFound"),
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setRestaurant(restaurantData);
      
      const lang = restaurantData.ui_language === "en" 
        ? "en" 
        : restaurantData.ui_language === "tr" 
          ? "tr" 
          : "fr";
          
      setUiLanguage(lang);
      await fetchCategories();
    } catch (error) {
      console.error("Error loading restaurant and menu:", error);
      toast({
        title: t("restaurantNotFound"),
        description: t("sorryNotFound"),
        variant: "destructive"
      });
      setLoading(false);
    }
  }, [restaurantSlug, navigate, toast, t, fetchCategories, setUiLanguage]);

  return {
    loading,
    setLoading,
    restaurant,
    setRestaurant,
    categories,
    setCategories,
    refreshTrigger,
    loadRestaurantAndMenu,
    handleRefreshMenu
  };
};
