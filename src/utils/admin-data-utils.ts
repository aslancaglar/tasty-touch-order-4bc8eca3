
import { forceFlushMenuCache } from "@/services/cache-service";
import { preloadAllRestaurantData } from "@/utils/data-preloader";
import { QueryClient } from "@tanstack/react-query";

/**
 * Utility functions for admin/owner routes to ensure fresh data
 */

/**
 * Ensures fresh data for admin/owner dashboards by:
 * 1. Flushing any cached data for the restaurant
 * 2. Invalidating related React Query cache keys
 * 
 * @param restaurantId The restaurant ID to refresh data for
 * @param queryClient Optional QueryClient instance
 */
export const ensureFreshRestaurantData = (
  restaurantId: string,
  queryClient?: QueryClient
) => {
  console.log(`[AdminDataUtils] Ensuring fresh data for restaurant: ${restaurantId}`);
  
  // 1. Force flush any localStorage cache
  forceFlushMenuCache(restaurantId);
  
  // 2. If we have a queryClient, invalidate all related queries
  if (queryClient) {
    // Invalidate all queries related to this restaurant
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        if (Array.isArray(queryKey) && queryKey.length > 0) {
          // Check if the query key contains the restaurant ID or related patterns
          const keyStr = JSON.stringify(queryKey);
          return (
            keyStr.includes(restaurantId) ||
            keyStr.includes("restaurant") ||
            keyStr.includes("menu") ||
            keyStr.includes("orders") ||
            keyStr.includes("statistics")
          );
        }
        return false;
      },
    });
    console.log(`[AdminDataUtils] Invalidated React Query cache for restaurant: ${restaurantId}`);
  }
};

/**
 * Preloads restaurant data with admin context (skips caching)
 * Used when we need to preload data but ensure we're not using cached values
 */
export const preloadAdminRestaurantData = async (
  restaurantSlug: string
) => {
  console.log(`[AdminDataUtils] Preloading fresh data for restaurant: ${restaurantSlug}`);
  
  try {
    const restaurant = await preloadAllRestaurantData(
      restaurantSlug,
      {
        forceRefresh: true, // Always force refresh
        isAdmin: true, // Mark as admin context
      }
    );
    
    console.log(`[AdminDataUtils] Successfully preloaded fresh data for: ${restaurant?.name || restaurantSlug}`);
    return restaurant;
  } catch (error) {
    console.error(`[AdminDataUtils] Error preloading restaurant data:`, error);
    throw error;
  }
};

/**
 * Hook to use in admin/owner components that ensures the queryOptions always 
 * fetch fresh data instead of using stale cache
 */
export const getAdminQueryOptions = <T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>
) => {
  return {
    queryKey,
    queryFn,
    staleTime: 0, // Always consider data stale immediately
    gcTime: 1000 * 60, // Keep for 1 minute only
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnMount: true, // Always refetch when component mounts
  };
};
