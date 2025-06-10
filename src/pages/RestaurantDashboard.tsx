
import { useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatisticsTab } from "@/components/restaurant/StatisticsTab";
import { OrdersTab } from "@/components/restaurant/OrdersTab";
import { MenuTab } from "@/components/restaurant/MenuTab";
import { ToppingsTab } from "@/components/restaurant/ToppingsTab";
import { SettingsTab } from "@/components/restaurant/SettingsTab";
import { StockTab } from "@/components/restaurant/StockTab";

const RestaurantDashboard = () => {
  const { restaurantId } = useParams();
  const { user, loading } = useAuth();

  if (loading) {
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
          <div className="text-sm text-gray-500">
            Restaurant ID: {restaurantId}
          </div>
        </div>

        <Tabs defaultValue="statistics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu</TabsTrigger>
            <TabsTrigger value="toppings">Toppings</TabsTrigger>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            <StatisticsTab restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersTab restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="menu" className="space-y-4">
            <MenuTab restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="toppings" className="space-y-4">
            <ToppingsTab restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            <StockTab restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsTab restaurantId={restaurantId} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RestaurantDashboard;
