
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
    allowAdminAccess,
    pathname: location.pathname
  });

  // Show loading spinner while auth state is being determined
  if (loading || !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading..." : "Verifying authentication..."}
          </p>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin required but user is not admin
  if (requireAdmin && isAdmin === false) {
    console.log("ProtectedRoute: Admin required but user is not admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // Admin user on owner route (and not allowed)
  if (isAdmin === true && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("ProtectedRoute: Admin user on owner route, redirecting to admin dashboard");
    return <Navigate to="/" replace />;
  }

  // Access granted
  console.log("ProtectedRoute: Access granted, showing content");
  return <>{children}</>;
};

export default ProtectedRoute;
