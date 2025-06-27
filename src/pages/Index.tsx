
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, isAdmin, refreshAuth } = useAuth();
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  console.log("Index render:", { 
    user: !!user, 
    loading, 
    isAdmin
  });

  // Show refresh button after 10 seconds if still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setShowRefreshButton(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [loading]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setShowRefreshButton(false);
    try {
      await refreshAuth();
    } catch (error) {
      console.error("Manual refresh failed:", error);
      setTimeout(() => setShowRefreshButton(true), 2000);
    }
  };

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="text-gray-600">Loading...</p>
          {showRefreshButton && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Taking longer than expected?</p>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log("No user, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // User is not admin - redirect to owner page
  if (isAdmin === false) {
    console.log("User is not admin, redirecting to owner");
    return <Navigate to="/owner" replace />;
  }

  // User is admin - show dashboard
  if (isAdmin === true) {
    console.log("User is admin, showing dashboard");
    return <Dashboard />;
  }

  // Admin status still null (shouldn't happen with new flow)
  console.log("Admin status unknown, showing loading");
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
        <p className="text-gray-600">Verifying permissions...</p>
      </div>
    </div>
  );
};

export default Index;
