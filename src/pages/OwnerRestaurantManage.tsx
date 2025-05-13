
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UtensilsCrossed, Cherry, Receipt, Package, ChartBar, RefreshCw, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/database-types";
import MenuTab from "@/components/restaurant/MenuTab";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import StockTab from "@/components/restaurant/StockTab";
import StatisticsTab from "@/components/restaurant/StatisticsTab";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { forceFlushMenuCache } from "@/services/cache-service";
import { preloadAdminRestaurantData, ensureFreshRestaurantData } from "@/utils/admin-data-utils";
import { useQueryClient } from "@tanstack/react-query";
import { isOnline, retryNetworkRequest } from "@/utils/service-worker";
import { handleCacheError } from "@/utils/cache-config";

const OwnerRestaurantManage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingData, setRefreshingData] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { t } = useTranslation(language);
  const queryClient = useQueryClient();
  
  // Check online status
  useEffect(() => {
    const handleOnlineStatusChange = (online: boolean) => {
      setIsOffline(!online);
      if (online && refreshError) {
        // Clear refresh error when we come back online
        setRefreshError(null);
      }
    };
    
    // Setup listener
    window.addEventListener('online', () => handleOnlineStatusChange(true));
    window.addEventListener('offline', () => handleOnlineStatusChange(false));
    
    // Initial check
    handleOnlineStatusChange(isOnline());
    
    return () => {
      window.removeEventListener('online', () => handleOnlineStatusChange(true));
      window.removeEventListener('offline', () => handleOnlineStatusChange(false));
    };
  }, [refreshError]);
  
  // Function to refresh kiosk data
  const handleRefreshKioskData = useCallback(async () => {
    if (!restaurant) return;
    
    setRefreshingData(true);
    setRefreshError(null);
    
    try {
      // Check if we're online first
      if (!isOnline()) {
        throw new Error("You're currently offline. Cannot refresh kiosk data without an internet connection.");
      }
      
      // IMPROVED: First try to preload data, then only if successful, flush the cache
      console.log(`[RestaurantManage] Refreshing data for restaurant: ${restaurant.id}`);
      
      // 1. Invalidate all React Query cache for this restaurant
      console.log(`[RestaurantManage] Invalidating React Query cache for restaurant: ${restaurant.id}`);
      ensureFreshRestaurantData(restaurant.id, queryClient);
      
      // 2. Preload fresh data for kiosk with retry logic
      if (restaurant.slug) {
        console.log(`[RestaurantManage] Preloading fresh data for restaurant: ${restaurant.slug}`);
        await retryNetworkRequest(
          () => preloadAdminRestaurantData(restaurant.slug || ''),
          3,  // max retries
          500 // initial delay in ms
        );
      }
      
      // 3. Only clear cache AFTER successful data fetch
      console.log(`[RestaurantManage] Successfully refreshed data, now flushing menu cache for restaurant: ${restaurant.id}`);
      forceFlushMenuCache(restaurant.id);
      
      console.log(`[RestaurantManage] Successfully refreshed kiosk data for: ${restaurant.name}`);
      toast({
        title: t("cache.refreshSuccess"),
        description: `${restaurant.name} - ${new Date().toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error("[RestaurantManage] Error refreshing kiosk data:", error);
      
      // Generate a user-friendly error message
      const errorMessage = handleCacheError("refresh menu", error);
      setRefreshError(errorMessage);
      
      toast({
        title: t("cache.refreshError"),
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setRefreshingData(false);
    }
  }, [restaurant, queryClient, toast, t]);
  
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // First check if the current user owns this restaurant
        const { data: ownedRestaurants, error: ownedError } = await supabase.rpc('get_owned_restaurants');
        if (ownedError) {
          console.error("Error checking restaurant ownership:", ownedError);
          toast({
            title: "Access Error",
            description: "Could not verify restaurant ownership.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
        
        const foundRestaurant = ownedRestaurants?.find(r => r.id === id);
        if (!foundRestaurant) {
          toast({
            title: "Access Denied",
            description: "You don't have access to this restaurant.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // User has access to this restaurant
        setRestaurant(foundRestaurant);

        // When loading the restaurant management page, force fresh data
        ensureFreshRestaurantData(foundRestaurant.id, queryClient);

        // Set language based on restaurant settings
        if (foundRestaurant.ui_language) {
          console.log("Setting language from restaurant:", foundRestaurant.ui_language);
          setLanguage(foundRestaurant.ui_language as SupportedLanguage);
        }
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurant();
  }, [id, toast, queryClient]);
  
  const handleRestaurantUpdated = (updatedRestaurant: Restaurant) => {
    setRestaurant(updatedRestaurant);

    // Update language when restaurant settings are changed
    if (updatedRestaurant.ui_language) {
      console.log("Restaurant updated, setting language:", updatedRestaurant.ui_language);
      setLanguage(updatedRestaurant.ui_language as SupportedLanguage);
    }
  };
  
  if (loading && !restaurant) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!restaurant) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">{t("restaurants.notFound")}</h1>
          <Button asChild>
            <Link to="/owner">{t("restaurants.backToRestaurants")}</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-8">
        <Button variant="ghost" asChild className="self-start">
          <Link to="/owner">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("restaurants.backToRestaurants")}
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{restaurant?.name}</h1>
          <p className="text-muted-foreground">{restaurant?.location || t("restaurants.noLocationDefined")}</p>
        </div>
        <div className="ml-0 sm:ml-auto mt-2 sm:mt-0 flex flex-wrap gap-2">
          {isOffline && (
            <div className="bg-destructive text-white px-4 py-2 rounded-md flex items-center mr-2">
              <WifiOff className="h-4 w-4 mr-2" />
              {t("general.offline")}
            </div>
          )}
          
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            onClick={handleRefreshKioskData}
            disabled={refreshingData || isOffline}
            className={refreshError ? "border-red-500 hover:border-red-600" : ""}
          >
            {refreshingData ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("cache.refreshing")}
              </>
            ) : (
              <>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshError ? "text-red-500" : ""}`} />
                {t("cache.refreshData")}
              </>
            )}
          </Button>
          
          <Button variant="outline" asChild size={isMobile ? "sm" : "default"}>
            <Link to={`/r/${restaurant?.slug}`} target="_blank">
              {t("restaurants.viewKiosk")}
            </Link>
          </Button>
        </div>
      </div>
      
      {refreshError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <WifiOff className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {refreshError}
              </p>
              <button 
                onClick={handleRefreshKioskData}
                disabled={refreshingData || isOffline}
                className="mt-2 text-sm text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle>{t("restaurants.management")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 gap-1">
              <TabsTrigger value="menu" className="flex items-center justify-center">
                <UtensilsCrossed className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && t("restaurant.menu")}
              </TabsTrigger>
              <TabsTrigger value="toppings" className="flex items-center justify-center">
                <Cherry className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && t("restaurant.toppings")}
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center justify-center">
                <Receipt className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && t("restaurant.orders")}
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center justify-center">
                <Package className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && t("restaurant.stock")}
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center justify-center">
                <ChartBar className={isMobile ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!isMobile && (t("restaurant.statistics") || "Statistics")}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="menu">
              <MenuTab restaurant={restaurant} />
            </TabsContent>
            
            <TabsContent value="toppings">
              <ToppingsTab restaurant={restaurant} />
            </TabsContent>
            
            <TabsContent value="orders">
              <OrdersTab restaurant={restaurant} />
            </TabsContent>
            
            <TabsContent value="stock">
              {restaurant && <StockTab restaurant={restaurant} />}
            </TabsContent>

            <TabsContent value="statistics">
              {restaurant && <StatisticsTab restaurant={restaurant} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerRestaurantManage;
