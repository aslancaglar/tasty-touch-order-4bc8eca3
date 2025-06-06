
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
    console.log(`[Index] ${new Date().toISOString()} - Disabled caching for admin routes`);
    
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

  console.log(`[Index] ${new Date().toISOString()} - Render - Loading:`, loading, "AdminCheckCompleted:", adminCheckCompleted, "User:", !!user, "IsAdmin:", isAdmin);

  // IMPROVED: Better loading state handling
  if (loading) {
    console.log(`[Index] ${new Date().toISOString()} - Showing loading spinner for auth loading`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Loading authentication...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your session...</p>
        </div>
      </div>
    );
  }

  // IMPROVED: Separate check for admin verification when user exists
  if (user && !adminCheckCompleted) {
    console.log(`[Index] ${new Date().toISOString()} - Showing loading spinner for admin check`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying permissions...</p>
          <p className="mt-2 text-sm text-gray-500">Checking your access level...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log(`[Index] ${new Date().toISOString()} - No authenticated user, redirecting to auth`);
    return <Navigate to="/auth" replace />;
  }

  // IMPROVED: Handle admin status more robustly
  // If adminCheckCompleted is true but isAdmin is still null, default to false
  const finalAdminStatus = adminCheckCompleted ? (isAdmin ?? false) : isAdmin;

  // If user is not an admin, redirect to owner page
  if (finalAdminStatus === false) {
    console.log(`[Index] ${new Date().toISOString()} - User is not an admin, redirecting to owner page`);
    return <Navigate to="/owner" replace />;
  }

  // User is admin, render Dashboard
  console.log(`[Index] ${new Date().toISOString()} - User is admin, rendering Dashboard`);
  return <Dashboard />;
};

export default Index;
