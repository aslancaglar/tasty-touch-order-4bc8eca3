
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  // Added property to allow admins to still access owner routes when needed
  allowAdminAccess?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requireAdmin = false, 
  allowAdminAccess = true 
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [securityFailure, setSecurityFailure] = useState(false);

  // Clear any previous errors when dependencies change
  useEffect(() => {
    setAuthError(null);
    setSecurityFailure(false);
  }, [user, isAdmin]);

  console.log("ProtectedRoute render:", {
    pathname: location.pathname,
    loading,
    adminCheckCompleted,
    user: !!user,
    isAdmin,
    requireAdmin,
    allowAdminAccess
  });

  // Show loading spinner while authentication is being checked
  if (loading || !adminCheckCompleted) {
    console.log("ProtectedRoute: Showing loading state");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Verifying authentication..." : "Checking permissions..."}
          </p>
        </div>
      </div>
    );
  }

  // Show security error if verification failed but user is logged in
  if (securityFailure && user) {
    console.log("ProtectedRoute: Showing security failure");
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Security Verification Failed</AlertTitle>
          <AlertDescription>
            {authError || "There was a problem verifying your permissions. Please try logging out and back in."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    // Save the location they were trying to access for redirect after login
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle admin-required routes for non-admin users
  if (requireAdmin && isAdmin === false) {
    console.log("ProtectedRoute: Access denied - User is not an admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // Handle admin-required routes when admin status is still null (shouldn't happen now)
  if (requireAdmin && isAdmin === null) {
    console.log("ProtectedRoute: Admin status null, showing loading");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  // Handle owner routes for admin users - only redirect if specifically 
  // requested to not allow admin access and we're on the specific owner path
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("ProtectedRoute: Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted", { requireAdmin, isAdmin });
  return <>{children}</>;
};

export default ProtectedRoute;
