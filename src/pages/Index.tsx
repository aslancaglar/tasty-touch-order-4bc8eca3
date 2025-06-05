
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const { toast } = useToast();

  // Ensure caching is properly set when the admin dashboard loads
  useEffect(() => {
    // Check network status
    const online = isOnline();
    
    // Make sure admin caching is disabled
    setCachingEnabledForAdmin(false);
    console.log("[Index] Disabled caching for admin routes");
    
    // Warn if offline - admin features require connectivity
    if (!online) {
      toast({
        title: "You're offline",
        description: "Admin dashboard requires internet connectivity for full functionality",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  console.log("[Index] Current state:", { user: !!user, loading, isAdmin, adminCheckCompleted });

  // Let ProtectedRoute handle all loading states - no redundant loading here
  // If no user is authenticated, redirect to auth page
  if (!user && !loading && adminCheckCompleted) {
    console.log("[Index] No authenticated user, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  // If user is not an admin, redirect to owner page
  if (user && isAdmin === false && adminCheckCompleted) {
    console.log("[Index] User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" />;
  }

  // If user is admin, render Dashboard
  if (user && isAdmin === true && adminCheckCompleted) {
    console.log("[Index] User is admin, rendering Dashboard");
    return <Dashboard />;
  }

  // For all other cases (loading states), let ProtectedRoute handle the loading UI
  return null;
};

export default Index;
