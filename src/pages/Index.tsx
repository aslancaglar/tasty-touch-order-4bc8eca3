
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, isAdmin, adminCheckCompleted, authError, retryAuth } = useAuth();
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

  // Show error state with retry option
  if (authError) {
    console.log("Index: Showing error state");
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Authentication Error</AlertTitle>
            <AlertDescription className="text-red-700 mb-4">
              {authError}
            </AlertDescription>
            <div className="flex gap-2">
              <Button onClick={retryAuth} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Refresh Page
              </Button>
            </div>
          </Alert>
        </div>
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
