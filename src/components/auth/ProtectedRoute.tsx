
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SecureLogger } from "@/utils/secure-logger";

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

  // Secure logging - only in development
  if (process.env.NODE_ENV === 'development') {
    SecureLogger.debug("ProtectedRoute access check", {
      component: 'ProtectedRoute',
      userId: user?.id?.slice(0, 8)
    }, { 
      hasUser: !!user, 
      loading, 
      isAdmin, 
      adminCheckCompleted, 
      requireAdmin, 
      allowAdminAccess, 
      pathname: location.pathname
    });
  }

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
      SecureLogger.warn("Emergency timeout reached in ProtectedRoute", {
        component: 'ProtectedRoute',
        action: 'emergency_timeout'
      });
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
    SecureLogger.info("No authenticated user, redirecting", {
      component: 'ProtectedRoute',
      action: 'redirect_to_auth'
    });
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin required but user is not admin
  if (requireAdmin && isAdmin === false) {
    SecureLogger.info("Non-admin user accessing admin route", {
      component: 'ProtectedRoute',
      action: 'redirect_non_admin',
      userId: user?.id?.slice(0, 8)
    });
    return <Navigate to="/owner" replace />;
  }

  // Admin user on owner route (and not allowed)
  if (isAdmin === true && location.pathname === '/owner' && !allowAdminAccess) {
    SecureLogger.info("Admin user on owner route, redirecting", {
      component: 'ProtectedRoute',
      action: 'redirect_admin_user',
      userId: user?.id?.slice(0, 8)
    });
    return <Navigate to="/" replace />;
  }

  // Access granted
  if (process.env.NODE_ENV === 'development') {
    SecureLogger.debug("Access granted", {
      component: 'ProtectedRoute',
      action: 'access_granted',
      userId: user?.id?.slice(0, 8)
    });
  }
  return <>{children}</>;
};

export default ProtectedRoute;
