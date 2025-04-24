import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SettingsTab from "@/components/restaurant/SettingsTab";
import MenuTab from "@/components/restaurant/MenuTab";
import OrdersTab from "@/components/restaurant/OrdersTab";
import { Restaurant } from "@/types/database-types";
import { Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ToppingsTab from "@/components/restaurant/ToppingsTab";
import { duplicateRestaurant } from "@/services/kiosk-service";
import { supabase } from "@/integrations/supabase/client";

const RestaurantManage = () => {
  const { id } = useParams(); // We're getting ID from the URL
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDuplicateRestaurant = async () => {
    if (!restaurant) return;
    
    try {
      await duplicateRestaurant(restaurant.id);
      toast({
        title: "Success",
        description: "Restaurant duplicated successfully",
      });
      navigate('/restaurants');
    } catch (error) {
      console.error('Error duplicating restaurant:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate restaurant",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("*")
          .eq("id", id)
          .single();
          
        if (error) {
          throw error;
        }
        
        setRestaurant(data);
      } catch (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Error",
          description: "Failed to load restaurant",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id, toast]);

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
          Restaurant not found.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{restaurant?.name}</h1>
          <p className="text-muted-foreground">Manage your restaurant settings and menu</p>
        </div>
        <Button onClick={handleDuplicateRestaurant} className="bg-green-600 hover:bg-green-700">
          <Copy className="mr-2 h-4 w-4" />
          Duplicate Restaurant
        </Button>
      </div>
      
      <Tabs defaultValue="settings" className="w-full">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="toppings">Toppings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SettingsTab restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="menu">
          <MenuTab restaurant={restaurant} />
        </TabsContent>
         <TabsContent value="toppings">
          <ToppingsTab restaurant={restaurant} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab restaurant={restaurant} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default RestaurantManage;
