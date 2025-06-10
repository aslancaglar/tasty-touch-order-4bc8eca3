
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatisticsTab from "@/components/restaurant/StatisticsTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import SettingsTab from "@/components/restaurant/SettingsTab";
import StockTab from "@/components/restaurant/StockTab";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";

const RestaurantDashboard = () => {
  const { restaurantId } = useParams();
  const { user, loading } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!restaurantId) return;
      
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (error) throw error;
        
        setRestaurant(data);
      } catch (error) {
        console.error('Error fetching restaurant:', error);
        toast({
          title: "Error",
          description: "Failed to load restaurant data",
          variant: "destructive"
        });
      } finally {
        setIsLoadingRestaurant(false);
      }
    };

    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId, toast]);

  if (loading || isLoadingRestaurant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (!restaurantId) {
    return <Navigate to="/restaurants" />;
  }

  if (!restaurant) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Restaurant not found</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
          <div className="text-sm text-gray-500">
            {restaurant.name}
          </div>
        </div>

        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            <StatisticsTab restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersTab restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <StockTab restaurant={restaurant} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsTab 
              restaurant={restaurant} 
              onRestaurantUpdated={setRestaurant}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RestaurantDashboard;
