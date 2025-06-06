
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Store, LogOut, AlertCircle } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { forceFlushMenuCache } from "@/services/cache-service";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
          console.log("OwnerDashboard: No user found");
          setLoading(false);
          return;
        }
        
        console.log("OwnerDashboard: Fetching restaurants for user:", user.id);
        setLoading(true);
        setError(null);
        
        // Always fetch fresh data for admin/owner interfaces
        const { data, error } = await supabase
          .rpc('get_owned_restaurants');
        
        if (error) {
          console.error("OwnerDashboard: Error fetching restaurants:", error);
          setError("Could not load your restaurants. This might be due to missing permissions or RLS policies.");
          
          toast({
            title: "Error Loading Restaurants",
            description: "Could not load your restaurants. Please check your permissions or contact support.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("OwnerDashboard: Successfully fetched restaurants:", data);

        // Set restaurants data
        const restaurantData = data || [];
        setRestaurants(restaurantData);
        
        // Set language based on the first restaurant if available
        if (restaurantData.length > 0 && restaurantData[0].ui_language) {
          const restaurantLanguage = restaurantData[0].ui_language as SupportedLanguage;
          console.log("OwnerDashboard: Setting language from restaurant:", restaurantLanguage);
          setLanguage(restaurantLanguage);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("OwnerDashboard: Exception when fetching restaurants:", error);
        setError("An unexpected error occurred while loading restaurants.");
        
        toast({
          title: "Unexpected Error",
          description: "An unexpected error occurred. Please try refreshing the page.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchOwnerRestaurants();
  }, [user, toast]);

  const handleSignOut = async () => {
    try {
      console.log("OwnerDashboard: Signing out user");
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate('/owner/login');
    } catch (error) {
      console.error("OwnerDashboard: Error signing out:", error);
      toast({
        title: "Error",
        description: "There was a problem signing out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    console.log("OwnerDashboard: Showing loading state");
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Loading your restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log("OwnerDashboard: Showing error state:", error);
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
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  console.log("OwnerDashboard: Rendering dashboard with", restaurants.length, "restaurants");

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
      
      {restaurants.length === 0 ? (
        <div className="text-center py-10">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">{t("restaurants.noRestaurants")}</h2>
          <p className="text-muted-foreground mt-2">
            {t("restaurants.startAdding")}
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
