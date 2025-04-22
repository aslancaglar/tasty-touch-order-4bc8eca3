import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  ArrowLeft, 
  UtensilsCrossed, 
  Cherry, 
  Receipt, 
  Settings,
  Copy,
  Check
} from "lucide-react";
import { getRestaurants } from "@/services/kiosk-service";
import { Restaurant } from "@/types/database-types";
import MenuTab from "@/components/restaurant/MenuTab";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import SettingsTab from "@/components/restaurant/SettingsTab";

const RestaurantManage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("menu");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();
  
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

  const handleCopyUrl = () => {
    if (!restaurant) return;
    
    const url = `${window.location.origin}/r/${restaurant.slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    
    toast({
      title: "URL Copié",
      description: "L'URL du kiosk a été copié dans le presse-papier",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !restaurant) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!restaurant) {
    return (
      <AdminLayout>
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold mb-4">Restaurant not found</h1>
          <Button asChild>
            <Link to="/restaurants">Back to Restaurants</Link>
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
            Retour aux Restaurants
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{restaurant?.name}</h1>
          <div className="flex items-center mt-2 space-x-2">
            <Input 
              value={`${window.location.origin}/r/${restaurant?.slug}`}
              readOnly
              className="bg-muted text-muted-foreground w-[300px]"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyUrl}
              className="flex items-center"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">{restaurant?.location || "Aucun emplacement défini"}</p>
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Gestion du Restaurant</CardTitle>
            <Button variant="outline" asChild>
              <Link to={`/r/${restaurant?.slug}`} target="_blank">
                Voir Kiosk
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="menu" className="flex items-center">
                <UtensilsCrossed className="mr-2 h-4 w-4" />
                Menu
              </TabsTrigger>
              <TabsTrigger value="toppings" className="flex items-center">
                <Cherry className="mr-2 h-4 w-4" />
                Suppléments
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                Commandes
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
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
            
            <TabsContent value="settings">
              {restaurant && (
                <SettingsTab 
                  restaurant={restaurant} 
                  onRestaurantUpdated={handleRestaurantUpdated} 
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default RestaurantManage;
