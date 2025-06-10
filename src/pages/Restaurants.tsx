
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Restaurant } from "@/types/database-types";
import { getRestaurants } from "@/services/kiosk-service";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/utils/language-utils";
import AddRestaurantDialog from "@/components/restaurant/AddRestaurantDialog";
import RestaurantCard from "@/components/restaurant/RestaurantCard";
import { useRestaurantStats } from "@/hooks/useRestaurantStats";

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Always use English for admin pages
  const { t } = useTranslation('en');

  const restaurantIds = restaurants.map((r) => r.id);
  const { stats, loadingStats } = useRestaurantStats(restaurantIds);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const data = await getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRestaurants();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("restaurants.title")}</h1>
          <p className="text-muted-foreground">
            {t("restaurants.subtitle")}
          </p>
        </div>
        <AddRestaurantDialog onRestaurantAdded={fetchRestaurants} t={t} />
      </div>

      {!user ? (
        <div className="text-center py-10">
          <p className="text-lg mb-3">{t("restaurants.needLogin")}</p>
          <Button asChild>
            <Link to="/auth">{t("restaurants.signIn")}</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : restaurants.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              stats={stats[restaurant.id]}
              loadingStats={loadingStats}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground mb-4">{t("restaurants.noRestaurants")}</p>
          <p className="text-muted-foreground mb-6">{t("restaurants.startAdding")}</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default Restaurants;
