import { useState, useEffect, useCallback } from 'react';
import { preloadToppingData, getCachedToppingCategories, clearOptimizedCache } from '@/services/optimized-kiosk-service';
import { useToast } from '@/hooks/use-toast';

interface UseOptimizedKioskProps {
  restaurantId: string;
  isAdmin?: boolean;
}

export const useOptimizedKiosk = ({ restaurantId, isAdmin = false }: UseOptimizedKioskProps) => {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();

  // Preload all restaurant data when hook is initialized
  useEffect(() => {
    if (!restaurantId) return;

    const initializeKiosk = async () => {
      setIsPreloading(true);
      setPreloadError(null);
      
      try {
        console.log(`[UseOptimizedKiosk] Initializing kiosk for restaurant ${restaurantId}`);
        
        // Check if we already have cached data
        const cachedData = getCachedToppingCategories(restaurantId, isAdmin);
        if (cachedData) {
          console.log(`[UseOptimizedKiosk] Found cached data, kiosk ready`);
          setIsReady(true);
          setIsPreloading(false);
          return;
        }

        // Preload topping data
        await preloadToppingData(restaurantId, isAdmin);
        
        console.log(`[UseOptimizedKiosk] Preloading complete, kiosk ready`);
        setIsReady(true);
        
      } catch (error) {
        console.error(`[UseOptimizedKiosk] Error during initialization:`, error);
        setPreloadError(error instanceof Error ? error.message : 'Failed to initialize kiosk');
        
        toast({
          title: "Loading Error",
          description: "Some features may load slower than expected.",
          variant: "destructive",
        });
      } finally {
        setIsPreloading(false);
      }
    };

    initializeKiosk();
  }, [restaurantId, isAdmin, toast]);

  // Function to manually refresh cache
  const refreshCache = useCallback(async () => {
    if (!restaurantId) return;

    setIsPreloading(true);
    setPreloadError(null);
    
    try {
      console.log(`[UseOptimizedKiosk] Manually refreshing cache for restaurant ${restaurantId}`);
      
      // Clear existing cache
      clearOptimizedCache(restaurantId);
      
      // Preload fresh data
      await preloadToppingData(restaurantId, isAdmin);
      
      console.log(`[UseOptimizedKiosk] Cache refresh complete`);
      setIsReady(true);
      
      toast({
        title: "Cache Refreshed",
        description: "Menu data has been updated.",
      });
      
    } catch (error) {
      console.error(`[UseOptimizedKiosk] Error during cache refresh:`, error);
      setPreloadError(error instanceof Error ? error.message : 'Failed to refresh cache');
      
      toast({
        title: "Refresh Error",
        description: "Failed to update menu data.",
        variant: "destructive",
      });
    } finally {
      setIsPreloading(false);
    }
  }, [restaurantId, isAdmin, toast]);

  // Function to clear cache
  const clearCache = useCallback(() => {
    if (!restaurantId) return;
    
    console.log(`[UseOptimizedKiosk] Manually clearing cache for restaurant ${restaurantId}`);
    clearOptimizedCache(restaurantId);
    setIsReady(false);
    
    toast({
      title: "Cache Cleared",
      description: "Menu data cache has been cleared.",
    });
  }, [restaurantId, toast]);

  return {
    isPreloading,
    preloadError,
    isReady,
    refreshCache,
    clearCache
  };
};