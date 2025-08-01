import { useEffect, useRef } from 'react';
import { MenuItem } from '@/types/database-types';
import { useMenuItemPreloader } from '@/hooks/useOptimizedMenuItemDetails';

interface MenuItemPreloaderProps {
  menuItems: MenuItem[];
  restaurantId: string;
  enabled?: boolean;
}

export const MenuItemPreloader: React.FC<MenuItemPreloaderProps> = ({
  menuItems,
  restaurantId,
  enabled = true
}) => {
  const { preloadItems } = useMenuItemPreloader();
  const preloadedIds = useRef(new Set<string>());
  const lastPreloadTime = useRef(0);
  const preloadTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled || menuItems.length === 0) return;

    // Debounce preloading to avoid excessive calls
    const PRELOAD_DEBOUNCE_MS = 500;
    
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      
      // Throttle preloading - don't preload more than once every 2 seconds
      if (now - lastPreloadTime.current < 2000) {
        return;
      }

      // Get items that haven't been preloaded yet
      const itemsToPreload = menuItems
        .filter(item => !preloadedIds.current.has(item.id))
        .map(item => item.id)
        .slice(0, 10); // Preload max 10 items at a time

      if (itemsToPreload.length > 0) {
        console.log(`[MenuPreloader] Preloading ${itemsToPreload.length} menu items`);
        
        preloadItems(itemsToPreload, restaurantId).then(() => {
          // Mark these items as preloaded
          itemsToPreload.forEach(id => preloadedIds.current.add(id));
          lastPreloadTime.current = now;
        }).catch(error => {
          console.error('[MenuPreloader] Preload failed:', error);
        });
      }
    }, PRELOAD_DEBOUNCE_MS);

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [menuItems, restaurantId, enabled, preloadItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
};