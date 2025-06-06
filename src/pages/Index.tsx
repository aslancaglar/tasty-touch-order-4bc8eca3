
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

  // Show loading for initial auth check
  if (loading) {
    console.log(`[Index] ${new Date().toISOString()} - Showing loading spinner for auth loading`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
          <p className="mt-2 text-sm text-gray-500">Please wait while we verify your session...</p>
        </div>
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log(`[Index] ${new Date().toISOString()} - No authenticated user, redirecting to auth`);
    return <Navigate to="/auth" replace />;
  }

  // Wait for admin check to complete for authenticated users
  if (!adminCheckCompleted) {
    console.log(`[Index] ${new Date().toISOString()} - Showing loading spinner for admin check`);
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying admin permissions...</p>
          <p className="mt-2 text-sm text-gray-500">Checking your access level...</p>
        </div>
      </div>
    );
  }

  // Now adminCheckCompleted is true and isAdmin should be a definitive boolean
  // If user is not an admin, redirect to owner page
  if (isAdmin === false) {
    console.log(`[Index] ${new Date().toISOString()} - User is confirmed non-admin, redirecting to owner page`);
    return <Navigate to="/owner" replace />;
  }

  // If user is confirmed admin, render Dashboard
  if (isAdmin === true) {
    console.log(`[Index] ${new Date().toISOString()} - User is confirmed admin, rendering Dashboard`);
    return <Dashboard />;
  }

  // This should not happen but provide a fallback
  console.warn(`[Index] ${new Date().toISOString()} - Unexpected state: adminCheckCompleted=${adminCheckCompleted}, isAdmin=${isAdmin}`);
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
        <p className="mt-4 text-gray-600">Processing access permissions...</p>
      </div>
    </div>
  );
};

export default Index;
