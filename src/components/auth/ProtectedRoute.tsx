
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowAdminAccess?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  allowAdminAccess = true 
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, refreshAuth } = useAuth();
  const location = useLocation();
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname
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

  // Show loading while auth is being determined
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
    console.log("ProtectedRoute: No user, redirecting to auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin required but user is not admin
  if (requireAdmin && isAdmin === false) {
    console.log("ProtectedRoute: Admin required but user is not admin");
    return <Navigate to="/owner" replace />;
  }

  // Admin user on owner route (and not allowed)
  if (isAdmin === true && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("ProtectedRoute: Admin user on owner route, redirecting");
    return <Navigate to="/" replace />;
  }

  // Access granted
  console.log("ProtectedRoute: Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;
