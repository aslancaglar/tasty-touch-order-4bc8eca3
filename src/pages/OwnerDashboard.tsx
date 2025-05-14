
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Store, LogOut, PlusCircle } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { forceFlushMenuCache } from "@/services/cache-service";

const OwnerDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const { t } = useTranslation(language);

  useEffect(() => {
    const fetchOwnerRestaurants = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }
        
        setLoading(true);
        setError(null);
        
        console.log("[OwnerDashboard] Fetching restaurants for user:", user.id);
        
        // Always fetch fresh data for admin/owner interfaces
        const { data, error } = await supabase
          .rpc('get_owned_restaurants');
        
        if (error) {
          console.error("[OwnerDashboard] Error fetching restaurants:", error);
          setError("Could not load restaurants");
          toast({
            title: "Error",
            description: "Could not load your restaurants. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Set restaurants data - could be empty array if user has no restaurants
        const restaurantData = data || [];
        console.log("[OwnerDashboard] Fetched restaurants:", restaurantData.length);
        setRestaurants(restaurantData);
        
        // Set language based on the first restaurant if available
        if (restaurantData.length > 0 && restaurantData[0].ui_language) {
          const restaurantLanguage = restaurantData[0].ui_language as SupportedLanguage;
          console.log("Setting language from restaurant:", restaurantLanguage);
          setLanguage(restaurantLanguage);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("[OwnerDashboard] Exception when fetching restaurants:", error);
        setError("An unexpected error occurred");
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchOwnerRestaurants();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate('/owner/login');
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("restaurants.title")}</h1>
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogOut size={18} />
          {t("sidebar.signOut")}
        </Button>
      </div>
      
      {error && (
        <div className="bg-destructive/15 p-4 rounded-md mb-6 text-destructive">
          <p className="font-medium">{t("common.error")}</p>
          <p>{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="mt-2"
          >
            {t("common.retry")}
          </Button>
        </div>
      )}
      
      {restaurants.length === 0 ? (
        <div className="text-center py-10">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">{t("restaurants.noRestaurants")}</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            {t("restaurants.startAdding")}
          </p>
          {/* Could add a create restaurant button here if needed */}
          <Button disabled className="flex items-center gap-2">
            <PlusCircle size={18} />
            {t("restaurants.create")}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Contact an administrator to add restaurants to your account.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("restaurants.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restaurants.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.location || t("restaurants.noLocationDefined")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild>
                        <Link to={`/owner/restaurant/${restaurant.id}`}>
                          {t("restaurants.manage")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerDashboard;
