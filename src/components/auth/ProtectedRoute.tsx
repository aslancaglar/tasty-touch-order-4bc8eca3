
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [fallbackTimer, setFallbackTimer] = useState(0);

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname,
    fallbackTimer
  });

  // Fallback mechanism to prevent infinite loading
  useEffect(() => {
    if (loading || !adminCheckCompleted) {
      const timer = setTimeout(() => {
        setFallbackTimer(prev => prev + 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setFallbackTimer(0);
    }
  }, [loading, adminCheckCompleted]);

  // Force navigation after reasonable timeout (15 seconds)
  useEffect(() => {
    if (fallbackTimer >= 15) {
      console.warn("ProtectedRoute: Fallback timeout reached, forcing auth redirect");
      if (!user) {
        // Force redirect to auth if no user after timeout
        window.location.href = '/auth';
      }
    }
  }, [fallbackTimer, user]);

  // Show loading spinner while auth state is being determined
  // But with improved timeout logic
  if ((loading || !adminCheckCompleted) && fallbackTimer < 15) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading..." : "Verifying authentication..."}
          </p>
          {fallbackTimer > 8 && (
            <p className="mt-2 text-sm text-gray-500">
              This is taking longer than usual... ({15 - fallbackTimer}s)
            </p>
          )}
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
