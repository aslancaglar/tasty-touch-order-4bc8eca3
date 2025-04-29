
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface RestaurantOwnerRouteProps {
  children: React.ReactNode;
  requireSpecificRestaurant?: boolean;
}

const RestaurantOwnerRoute = ({ 
  children, 
  requireSpecificRestaurant = true 
}: RestaurantOwnerRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const location = useLocation();
  const { id: restaurantId } = useParams();
  
  useEffect(() => {
    const checkOwnership = async () => {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        // Admin always has access
        if (isAdmin) {
          setHasAccess(true);
          setCheckingAccess(false);
          return;
        }

        const { isRestaurantOwner } = useAuth();
        
        if (requireSpecificRestaurant && restaurantId) {
          // Check if user owns this specific restaurant
          const isOwner = await isRestaurantOwner(restaurantId);
          setHasAccess(isOwner);
        } else {
          // Check if user is an owner of any restaurant
          const isOwner = await isRestaurantOwner();
          setHasAccess(isOwner);
        }
      } catch (error) {
        console.error("Error checking restaurant ownership:", error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    if (!loading) {
      checkOwnership();
    }
  }, [user, loading, restaurantId, isAdmin, requireSpecificRestaurant]);

  if (loading || checkingAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (hasAccess === false) {
    // Redirect to restaurants page if authenticated but not an owner
    return <Navigate to="/restaurants" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RestaurantOwnerRoute;
