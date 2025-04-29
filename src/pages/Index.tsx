
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const { user, loading, isAdmin } = useAuth();
  const [ownedRestaurant, setOwnedRestaurant] = useState<string | null>(null);
  const [checkingOwner, setCheckingOwner] = useState(true);

  useEffect(() => {
    const checkOwnership = async () => {
      if (user) {
        try {
          const { getOwnedRestaurants } = useAuth();
          const restaurants = await getOwnedRestaurants();
          
          if (restaurants && restaurants.length > 0) {
            // Get the first restaurant ID (assuming owner is linked to only one restaurant)
            setOwnedRestaurant(restaurants[0].id);
          }
        } catch (error) {
          console.error("Error checking restaurant ownership:", error);
        } finally {
          setCheckingOwner(false);
        }
      } else {
        setCheckingOwner(false);
      }
    };
    
    if (!loading) {
      checkOwnership();
    }
  }, [user, loading]);

  if (loading || checkingOwner) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // If user owns a restaurant and is not an admin, redirect them directly to their restaurant management page
  if (ownedRestaurant && !isAdmin) {
    return <Navigate to={`/restaurant/${ownedRestaurant}`} />;
  }

  // If user is an admin, show the admin dashboard
  return <Dashboard />;
};

export default Index;
