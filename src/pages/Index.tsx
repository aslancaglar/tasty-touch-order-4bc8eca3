
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

  console.log("Index render - Loading:", loading, "AdminCheckCompleted:", adminCheckCompleted, "User:", !!user, "IsAdmin:", isAdmin);

  // Display loading state until both authentication and admin check are complete
  if (loading || !adminCheckCompleted) {
    console.log("Index: Showing loading spinner");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading authentication..." : "Verifying permissions..."}
          </p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log("Index: No authenticated user, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // If user is not an admin, redirect to owner page
  if (isAdmin === false) {
    console.log("Index: User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" replace />;
  }

  // If admin status is still null (shouldn't happen with improved logic)
  if (isAdmin === null) {
    console.log("Index: Admin status is null, showing loading");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // User is admin, render Dashboard
  console.log("Index: User is admin, rendering Dashboard");
  return <Dashboard />;
};

export default Index;
