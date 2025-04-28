
import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useParams } from "react-router-dom";
import { getRestaurants } from "@/services/kiosk-service";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrdersTab from "@/components/restaurant/OrdersTab";
import MenuTab from "@/components/restaurant/MenuTab";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import StockTab from "@/components/restaurant/StockTab";
import SettingsTab from "@/components/restaurant/SettingsTab";
import CacheManagement from "@/components/restaurant/CacheManagement";

const RestaurantManage = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        console.log("Fetching restaurant with ID:", restaurantId);
        
        // Using getRestaurants instead of getRestaurantById
        const restaurantsData = await getRestaurants();
        
        // Find the restaurant with the matching ID
        const data = restaurantsData.find(r => r.id === restaurantId) || null;
        
        if (data) {
          console.log("Restaurant found:", data);
          setRestaurant(data);
        } else {
          console.error("Restaurant not found with ID:", restaurantId);
          toast({
            title: "Error",
            description: `Restaurant with ID ${restaurantId} could not be found.`,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to fetch restaurant details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId, toast]);

  if (loading) {
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
        <div className="flex justify-center items-center h-[80vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Restaurant Not Found</h1>
            <p className="text-muted-foreground">
              The restaurant with the ID {restaurantId} could not be found.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <p className="text-muted-foreground">
              {restaurant.location} · ID: {restaurant.id}
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="orders">
          <TabsList className="mb-8">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="toppings">Toppings</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders">
            <OrdersTab restaurant={restaurant} />
          </TabsContent>
          
          <TabsContent value="menu">
            <MenuTab restaurant={restaurant} />
          </TabsContent>
          
          <TabsContent value="toppings">
            <ToppingsTab restaurant={restaurant} />
          </TabsContent>
          
          <TabsContent value="stock">
            <StockTab restaurant={restaurant} />
          </TabsContent>
          
          <TabsContent value="settings">
            <SettingsTab restaurant={restaurant} />
          </TabsContent>
          
          <TabsContent value="cache">
            <CacheManagement restaurantId={restaurant.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RestaurantManage;
