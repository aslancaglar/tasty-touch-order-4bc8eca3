
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    pathname: location.pathname 
  });

  // Show loading spinner while authentication is being checked
  if (loading || !adminCheckCompleted) {
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
    console.log("Access denied: User is not an admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // Handle owner routes for admin users
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;
