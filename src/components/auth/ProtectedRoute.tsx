
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { logSecurityEvent } from "@/utils/error-handler";

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
  const [securityFailure, setSecurityFailure] = useState(false);

  // Clear any previous errors when dependencies change
  useEffect(() => {
    setAuthError(null);
    setSecurityFailure(false);
  }, [user, isAdmin]);

  // Enhanced security logging
  useEffect(() => {
    if (!loading && adminCheckCompleted) {
      logSecurityEvent('Route access attempt', {
        path: location.pathname,
        userId: user?.id,
        isAdmin: isAdmin,
        requireAdmin: requireAdmin,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, isAdmin, loading, adminCheckCompleted, location.pathname, requireAdmin]);

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

  // Show security error if verification failed but user is logged in
  if (securityFailure && user) {
    logSecurityEvent('Security verification failure displayed', {
      userId: user?.id,
      path: location.pathname,
      error: authError
    });
    
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
    logSecurityEvent('Unauthenticated access attempt', {
      path: location.pathname,
      requireAdmin: requireAdmin,
      timestamp: new Date().toISOString()
    });
    
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Handle admin-required routes for non-admin users
  if (requireAdmin && !isAdmin) {
    console.log("Access denied: User is not an admin, redirecting to /owner");
    logSecurityEvent('Unauthorized admin access attempt', {
      userId: user.id,
      path: location.pathname,
      isAdmin: isAdmin,
      timestamp: new Date().toISOString()
    });
    
    return <Navigate to="/owner" replace />;
  }

  // Handle owner routes for admin users - only redirect if specifically 
  // requested to not allow admin access and we're on the specific owner path
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    logSecurityEvent('Admin redirected from owner route', {
      userId: user.id,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    return <Navigate to="/" replace />;
  }

  console.log("ProtectedRoute: Access granted", { requireAdmin, isAdmin });
  logSecurityEvent('Route access granted', {
    userId: user.id,
    path: location.pathname,
    isAdmin: isAdmin,
    requireAdmin: requireAdmin,
    timestamp: new Date().toISOString()
  });
  
  return <>{children}</>;
};

export default ProtectedRoute;
