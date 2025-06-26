
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("ProtectedRoute state:", {
      loading,
      adminCheckCompleted,
      user: user ? "present" : "null",
      isAdmin,
      requireAdmin,
      pathname: location.pathname
    });
  }, [loading, adminCheckCompleted, user, isAdmin, requireAdmin, location.pathname]);

  // Clear any previous errors when dependencies change
  useEffect(() => {
    setAuthError(null);
  }, [user, isAdmin]);

  // Show loading spinner while authentication is being checked
  if (loading || !adminCheckCompleted) {
    console.log("ProtectedRoute: Showing loading state");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
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
