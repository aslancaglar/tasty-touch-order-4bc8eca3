
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package } from "lucide-react";
import { getRestaurants } from "@/services/kiosk-service";
import { Restaurant } from "@/types/database-types";
import StockTab from "@/components/restaurant/StockTab";
import { Loader2 } from "lucide-react";

const StockManagement = () => {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const restaurants = await getRestaurants();
        const foundRestaurant = restaurants.find(r => r.id === id);
        
        if (foundRestaurant) {
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

  if (loading) {
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
          <Link to={`/restaurant/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurant
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">{restaurant.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <CardTitle>Inventory Control</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <StockTab restaurant={restaurant} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default StockManagement;
