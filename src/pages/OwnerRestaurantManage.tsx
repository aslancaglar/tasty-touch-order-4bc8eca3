import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, UtensilsCrossed, Cherry, Receipt, Package, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/database-types";
import MenuTab from "@/components/restaurant/MenuTab";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import StockTab from "@/components/restaurant/StockTab";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { useIsMobile } from "@/hooks/use-mobile";

const OwnerRestaurantManage = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const {
    t
  } = useTranslation(language);
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // First check if the current user owns this restaurant
        const {
          data: ownedRestaurants,
          error: ownedError
        } = await supabase.rpc('get_owned_restaurants');
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
  }, [id, toast]);
  const handleRestaurantUpdated = (updatedRestaurant: Restaurant) => {
    setRestaurant(updatedRestaurant);

    // Update language when restaurant settings are changed
    if (updatedRestaurant.ui_language) {
      console.log("Restaurant updated, setting language:", updatedRestaurant.ui_language);
      setLanguage(updatedRestaurant.ui_language as SupportedLanguage);
    }
  };
  if (loading && !restaurant) {
    return <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  if (!restaurant) {
    return <div className="container mx-auto py-8 px-4">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">{t("restaurants.notFound")}</h1>
          <Button asChild>
            <Link to="/owner">{t("restaurants.backToRestaurants")}</Link>
          </Button>
        </div>
      </div>;
  }
  return <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4">
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
        <div className="ml-0 sm:ml-auto mt-2 sm:mt-0">
          <Button variant="outline" asChild size={isMobile ? "sm" : "default"}>
            <Link to={`/owner/restaurant/${id}/settings`} className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              {t("restaurants.settings")}
            </Link>
          </Button>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle>{t("restaurants.management")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 gap-1">
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
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default OwnerRestaurantManage;
