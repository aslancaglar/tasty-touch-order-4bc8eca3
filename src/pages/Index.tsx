
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
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
    console.log("[AdminDashboard] Disabled caching for admin routes");
    
    // Warn if offline - admin features require connectivity
    if (!online) {
      toast({
        title: "You're offline",
        description: "Admin dashboard requires internet connectivity for full functionality",
        variant: "destructive",
        duration: 5000,
      });
    }
    
    return () => {
      // Reset when unmounting (though this likely won't matter)
      setCachingEnabled(true);
    };
  }, [toast]);

  // Display loading state until both authentication and admin check are complete
  if (loading || !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log("No authenticated user, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  // If user is not an admin, redirect to owner page
  if (user && isAdmin === false) {
    console.log("User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" />;
  }

  // User is admin, render Dashboard
  console.log("User is admin, rendering Dashboard");
  return <Dashboard />;
};

export default Index;
