
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendKioskRefreshSignal } from "@/integrations/supabase/client";

interface StockTabProps {
  restaurantId: string;
  menuItems: any[];
  toppings: any[];
  onUpdateMenuItemStock: (id: string, inStock: boolean) => Promise<void>;
  onUpdateToppingStock: (id: string, inStock: boolean) => Promise<void>;
}

const StockTab: React.FC<StockTabProps> = ({
  restaurantId,
  menuItems = [],
  toppings = [],
  onUpdateMenuItemStock,
  onUpdateToppingStock,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

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
                    await onUpdateMenuItemStock(item.id, checked);
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
                    await onUpdateToppingStock(topping.id, checked);
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
