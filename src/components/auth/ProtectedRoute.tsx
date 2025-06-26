
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
  const { user, loading, isAdmin, adminCheckCompleted, authError, retryAuth } = useAuth();
  const location = useLocation();
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("ProtectedRoute state:", {
      loading,
      adminCheckCompleted,
      user: user ? "present" : "null",
      isAdmin,
      requireAdmin,
      authError,
      pathname: location.pathname
    });
  }, [loading, adminCheckCompleted, user, isAdmin, requireAdmin, authError, location.pathname]);

  // Show retry button after a delay if still loading
  useEffect(() => {
    if (loading && !adminCheckCompleted) {
      const timer = setTimeout(() => {
        setShowRetryButton(true);
      }, 8000); // Show retry after 8 seconds

      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(false);
    }
  }, [loading, adminCheckCompleted]);

  // Show error state with retry option
  if (authError && !loading) {
    console.log("ProtectedRoute: Showing error state");
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

  // Show loading spinner while authentication is being checked
  if (loading || !adminCheckCompleted) {
    console.log("ProtectedRoute: Showing loading state");
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
          {showRetryButton && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-500">Taking longer than expected?</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={retryAuth} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle admin-required routes for non-admin users
  if (requireAdmin && !isAdmin) {
    console.log("ProtectedRoute: Access denied, user is not admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // Handle owner routes for admin users - only redirect if specifically 
  // requested to not allow admin access and we're on the specific owner path
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("ProtectedRoute: Admin user on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;
