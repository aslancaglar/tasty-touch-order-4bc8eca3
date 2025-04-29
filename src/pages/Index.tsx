
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const { user, loading, isAdmin, isRestaurantOwner } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);

  useEffect(() => {
    const checkOwnership = async () => {
      if (user) {
        try {
          const owner = await isRestaurantOwner();
          setIsOwner(owner);
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
  }, [user, loading, isRestaurantOwner]);

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

  // Modified logic: Only redirect restaurant owners to owner dashboard if they're not accessing a different specific route
  // We'll let the RestaurantOwnerRoute components handle access control for specific routes
  if (isOwner && !isAdmin) {
    return <Navigate to="/owner" />;
  }

  // If user is an admin, show the admin dashboard
  return <Dashboard />;
};

export default Index;
