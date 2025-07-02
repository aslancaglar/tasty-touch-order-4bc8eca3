
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
  const [emergencyTimer, setEmergencyTimer] = useState(0);

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname,
    emergencyTimer
  });

  // Emergency fallback mechanism with progressive feedback
  useEffect(() => {
    if (loading || !adminCheckCompleted) {
      const timer = setTimeout(() => {
        setEmergencyTimer(prev => prev + 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setEmergencyTimer(0);
    }
  }, [loading, adminCheckCompleted]);

  // Emergency redirect after 30 seconds (reduced from 15)
  useEffect(() => {
    if (emergencyTimer >= 30) {
      console.warn("ProtectedRoute: Emergency timeout reached, forcing navigation");
      if (!user) {
        window.location.href = '/auth';
      } else {
        // If we have a user but admin check is stuck, assume non-admin
        window.location.href = '/owner';
      }
    }
  }, [emergencyTimer, user]);

  // Show loading state with progressive feedback
  if ((loading || !adminCheckCompleted) && emergencyTimer < 30) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading..." : "Verifying authentication..."}
          </p>
          {emergencyTimer > 5 && (
            <p className="mt-2 text-sm text-gray-500">
              This is taking longer than usual... ({30 - emergencyTimer}s)
            </p>
          )}
          {emergencyTimer > 15 && (
            <p className="mt-1 text-xs text-gray-400">
              Checking authentication status...
            </p>
          )}
          {emergencyTimer > 25 && (
            <p className="mt-1 text-xs text-orange-500">
              Redirecting shortly if this continues...
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
