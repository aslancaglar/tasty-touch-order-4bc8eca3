
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { 
  ArrowLeft, 
  UtensilsCrossed, 
  Cherry, 
  Receipt, 
  Settings,
  Package,
  CreditCard
} from "lucide-react";
import { getRestaurants } from "@/services/kiosk-service";
import { Restaurant } from "@/types/database-types";
import MenuTab from "@/components/restaurant/MenuTab";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import SettingsTab from "@/components/restaurant/SettingsTab";
import StockTab from "@/components/restaurant/StockTab";
import PaymentTab from "@/components/restaurant/PaymentTab";
import { useTranslation } from "@/utils/language-utils";

const RestaurantManage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  // Always use English for admin pages
  const { t } = useTranslation('en');
  
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const restaurants = await getRestaurants();
        const foundRestaurant = restaurants.find(r => r.id === id);
        
        if (foundRestaurant) {
          console.log("Restaurant found:", foundRestaurant);
          setRestaurant(foundRestaurant);
        } else {
          toast({
            title: "Error",
            description: "Restaurant not found",
            variant: "destructive"
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, toast]);

  const handleRestaurantUpdated = (updatedRestaurant: Restaurant) => {
    console.log("Restaurant updated:", updatedRestaurant);
    setRestaurant(updatedRestaurant);
  };

  if (loading && !restaurant) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-700" />
        </div>
      </AdminLayout>
    );
  }

  if (!restaurant) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">{t("restaurants.notFound")}</h1>
          <Button asChild>
            <Link to="/restaurants">{t("restaurants.backToRestaurants")}</Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center mb-8">
        <Button variant="ghost" asChild className="mr-4">
          <Link to="/restaurants">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("restaurants.backToRestaurants")}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{restaurant?.name}</h1>
          <p className="text-muted-foreground">{restaurant?.location || t("restaurants.noLocationDefined")}</p>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>{t("restaurants.management")}</CardTitle>
            <Button variant="outline" asChild>
              <Link to={`/r/${restaurant?.slug}`} target="_blank">
                {t("restaurants.viewKiosk")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 mb-8">
              <TabsTrigger value="menu" className="flex items-center">
                <UtensilsCrossed className="mr-2 h-4 w-4" />
                {t("restaurant.menu")}
              </TabsTrigger>
              <TabsTrigger value="toppings" className="flex items-center">
                <Cherry className="mr-2 h-4 w-4" />
                {t("restaurant.toppings")}
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                {t("restaurant.orders")}
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                {t("restaurant.settings")}
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                {t("restaurant.stock")}
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
            
            <TabsContent value="payment">
              <PaymentTab restaurant={restaurant} />
            </TabsContent>
            
            <TabsContent value="settings">
              {restaurant && (
                <SettingsTab 
                  restaurant={restaurant} 
                  onRestaurantUpdated={handleRestaurantUpdated} 
                />
              )}
            </TabsContent>
            
            <TabsContent value="stock">
              {restaurant && (
                <StockTab restaurant={restaurant} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default RestaurantManage;
