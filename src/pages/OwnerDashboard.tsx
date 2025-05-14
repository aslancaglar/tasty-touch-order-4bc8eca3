
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Store, LogOut, PlusCircle, RefreshCw, AlertCircle } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, SupportedLanguage, DEFAULT_LANGUAGE } from "@/utils/language-utils";
import { forceFlushMenuCache } from "@/services/cache-service";
import { LoadingState } from "@/components/ui/loading-state";
import { useDelayedLoading } from "@/hooks/use-delayed-loading";
import { OwnerRestaurantSkeleton } from "@/components/restaurant/OwnerRestaurantSkeleton";
import { useConnectionStatus } from "@/hooks/use-network-aware-fetch";

const OwnerDashboard = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, signOut, refreshSession } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const { t } = useTranslation(language);
  const connectionStatus = useConnectionStatus();
  
  // Use our custom hook for better loading state management
  const { isLoading, isTimedOut, setIsLoading, reset: resetLoading } = useDelayedLoading(true, 10000);

  const fetchOwnerRestaurants = useCallback(async (showToast = false) => {
    try {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      resetLoading();
      setError(null);
      
      console.log("[OwnerDashboard] Fetching restaurants for user:", user.id);
      
      // Always fetch fresh data for admin/owner interfaces
      const { data, error } = await supabase
        .rpc('get_owned_restaurants');
      
      if (error) {
        console.error("[OwnerDashboard] Error fetching restaurants:", error);
        setError("Could not load restaurants");
        if (showToast) {
          toast({
            title: "Error",
            description: "Could not load your restaurants. Please try again.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
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
      
      setIsLoading(false);
      
      if (showToast) {
        toast({
          title: "Refreshed",
          description: "Restaurant data has been refreshed",
        });
      }
    } catch (error) {
      console.error("[OwnerDashboard] Exception when fetching restaurants:", error);
      setError("An unexpected error occurred");
      if (showToast) {
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }
  }, [user, toast, resetLoading, setIsLoading]);

  // Initial load
  useEffect(() => {
    fetchOwnerRestaurants();
    
    // Add a backup timeout to ensure we exit loading state
    const backupTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 15000);
    
    return () => clearTimeout(backupTimeout);
  }, [fetchOwnerRestaurants, setIsLoading]);

  const handleRefresh = useCallback(async () => {
    // First refresh the user session to ensure we have latest auth data
    await refreshSession();
    // Then fetch restaurants
    fetchOwnerRestaurants(true);
  }, [refreshSession, fetchOwnerRestaurants]);

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

  // Helper to determine what to render
  const renderContent = () => {
    // If in loading state and not timed out, show skeleton
    if (isLoading && !isTimedOut) {
      return <OwnerRestaurantSkeleton />;
    }
    
    // If we've timed out or have an error
    if (isTimedOut || error) {
      return (
        <LoadingState 
          status="retry"
          title={isTimedOut ? "Taking longer than expected" : "Failed to load restaurants"}
          description={
            isTimedOut 
              ? "This is taking longer than expected. Your network connection may be slow."
              : connectionStatus === "offline" 
                ? "You appear to be offline. Please check your connection and try again." 
                : "There was a problem loading your restaurants. Please try again."
          }
          onRetry={handleRefresh}
        />
      );
    }
    
    // If we have no restaurants
    if (restaurants.length === 0) {
      return (
        <div className="text-center py-10">
          <Store className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold">{t("restaurants.noRestaurants")}</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            {t("restaurants.startAdding")}
          </p>
          <Button disabled className="flex items-center gap-2">
            <PlusCircle size={18} />
            {t("restaurants.create")}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Contact an administrator to add restaurants to your account.
          </p>
        </div>
      );
    }
    
    // If we have restaurants, show the table
    return (
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
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t("restaurants.title")}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="mr-2"
            title="Refresh"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut size={18} />
            {t("sidebar.signOut")}
          </Button>
        </div>
      </div>
      
      {/* Network status warning */}
      {connectionStatus === "offline" && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded-md mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>You're currently offline. Some features may be limited.</p>
        </div>
      )}
      
      {renderContent()}
    </div>
  );
};

export default OwnerDashboard;
