
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendKioskRefreshSignal } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { MenuItem, Topping, Restaurant } from "@/types/database-types";

interface StockTabProps {
  restaurantId: string;
  menuItems: any[];
  toppings: any[];
  onUpdateMenuItemStock: (id: string, inStock: boolean) => Promise<void>;
  onUpdateToppingStock: (id: string, inStock: boolean) => Promise<void>;
}

// Let's also add a variant that accepts a restaurant object
interface RestaurantStockTabProps {
  restaurant: Restaurant;
}

const StockTab: React.FC<StockTabProps | RestaurantStockTabProps> = (props) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<Topping[]>([]);
  const { toast } = useToast();
  
  // Determine if we're using restaurantId or restaurant object
  const restaurantId = 'restaurant' in props 
    ? props.restaurant.id 
    : props.restaurantId;
  
  // If we have direct menuItems and toppings props, use those
  const hasDirectProps = 'menuItems' in props && 'toppings' in props;

  useEffect(() => {
    // If we don't have direct props, fetch the data
    if (!hasDirectProps) {
      fetchMenuItemsAndToppings();
    } else if ('menuItems' in props && 'toppings' in props) {
      // Use the direct props
      setMenuItems(props.menuItems);
      setToppings(props.toppings);
    }
  }, [restaurantId]);

  const fetchMenuItemsAndToppings = async () => {
    try {
      // Fetch menu items
      const { data: menuItemsData, error: menuItemsError } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          in_stock,
          category_id,
          menu_categories(name)
        `)
        .eq('menu_categories.restaurant_id', restaurantId);

      if (menuItemsError) throw menuItemsError;

      // Fetch toppings
      const { data: toppingsData, error: toppingsError } = await supabase
        .from('toppings')
        .select(`
          id,
          name,
          in_stock,
          category_id,
          topping_categories(name)
        `)
        .eq('topping_categories.restaurant_id', restaurantId);

      if (toppingsError) throw toppingsError;

      // Transform the data to add category_name
      const formattedMenuItems = menuItemsData.map((item: any) => ({
        ...item,
        category_name: item.menu_categories?.name || 'Unknown'
      }));

      const formattedToppings = toppingsData.map((topping: any) => ({
        ...topping,
        category_name: topping.topping_categories?.name || 'Unknown'
      }));

      setMenuItems(formattedMenuItems);
      setToppings(formattedToppings);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      toast({
        title: "Error",
        description: "Failed to load inventory data",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMenuItemStock = async (id: string, inStock: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ in_stock: inStock })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setMenuItems(prev => 
        prev.map(item => item.id === id ? { ...item, in_stock: inStock } : item)
      );
      
      toast({
        title: "Stock updated",
        description: `Item is now ${inStock ? 'in stock' : 'out of stock'}`,
      });
    } catch (error) {
      console.error("Error updating menu item stock:", error);
      toast({
        title: "Error",
        description: "Failed to update menu item stock",
        variant: "destructive",
      });
    }
  };

  const handleUpdateToppingStock = async (id: string, inStock: boolean) => {
    try {
      const { error } = await supabase
        .from('toppings')
        .update({ in_stock: inStock })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setToppings(prev => 
        prev.map(topping => topping.id === id ? { ...topping, in_stock: inStock } : topping)
      );
      
      toast({
        title: "Stock updated",
        description: `Topping is now ${inStock ? 'in stock' : 'out of stock'}`,
      });
    } catch (error) {
      console.error("Error updating topping stock:", error);
      toast({
        title: "Error",
        description: "Failed to update topping stock",
        variant: "destructive",
      });
    }
  };
  
  const handleRefreshKiosk = async () => {
    try {
      setIsRefreshing(true);
      await sendKioskRefreshSignal(restaurantId);
      toast({
        title: "Refresh signal sent",
        description: "All connected kiosks will refresh their view shortly.",
      });
    } catch (error) {
      console.error("Error refreshing kiosk:", error);
      toast({
        title: "Error",
        description: "Failed to send refresh signal.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <Button 
          onClick={handleRefreshKiosk}
          disabled={isRefreshing}
          className="bg-kiosk-primary"
        >
          {isRefreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Kiosk View
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.category_name}</p>
                </div>
                <Switch
                  checked={item.in_stock}
                  onCheckedChange={async (checked) => {
                    await handleUpdateMenuItemStock(item.id, checked);
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toppings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {toppings.map((topping) => (
              <div key={topping.id} className="flex items-center justify-between border p-4 rounded-lg">
                <div>
                  <h3 className="font-medium">{topping.name}</h3>
                  <p className="text-sm text-gray-500">{topping.category_name}</p>
                </div>
                <Switch
                  checked={topping.in_stock}
                  onCheckedChange={async (checked) => {
                    await handleUpdateToppingStock(topping.id, checked);
                  }}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockTab;
