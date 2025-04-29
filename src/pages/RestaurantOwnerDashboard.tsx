
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Restaurant } from "@/types/database-types";
import { Loader2, Settings } from "lucide-react";

const RestaurantOwnerDashboard = () => {
  const { user, getOwnedRestaurants } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnedRestaurants = async () => {
      setLoading(true);
      try {
        const ownedRestaurants = await getOwnedRestaurants();
        setRestaurants(ownedRestaurants);
      } catch (error) {
        console.error("Error fetching owned restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnedRestaurants();
  }, [getOwnedRestaurants]);

  return (
    <AdminLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Restaurant Owner Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your restaurants and view analytics
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden">
                <div className="h-40 w-full overflow-hidden">
                  <img
                    src={restaurant.image_url || "https://via.placeholder.com/400x200?text=No+Image"}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{restaurant.name}</CardTitle>
                  <CardDescription>{restaurant.location || "No location specified"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild>
                      <Link to={`/r/${restaurant.slug}`}>
                        View Kiosk
                      </Link>
                    </Button>
                    <Button variant="default" className="bg-primary" asChild>
                      <Link to={`/restaurant/${restaurant.id}`}>
                        <Settings className="mr-2 h-4 w-4" />
                        Manage
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <p className="text-lg text-muted-foreground">You don't have any restaurants yet.</p>
            <p className="text-muted-foreground">
              Contact an administrator to assign restaurants to your account.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default RestaurantOwnerDashboard;
