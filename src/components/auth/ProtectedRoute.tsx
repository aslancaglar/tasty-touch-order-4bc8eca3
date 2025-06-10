
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react";
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
  const { user, loading, isAdmin, adminCheckCompleted, userRole, validateSession } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [securityFailure, setSecurityFailure] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Enhanced session validation - only for admin routes with old sessions
  useEffect(() => {
    const checkSessionSecurity = async () => {
      if (user && adminCheckCompleted && requireAdmin) {
        try {
          // Only validate sessions that are older than 30 minutes for admin routes
          const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
          const sessionAge = Date.now() - sessionStart;
          
          if (sessionAge > 1800000) { // 30 minutes
            const isValid = await validateSession();
            setSessionValid(isValid);
            
            if (!isValid) {
              logSecurityEvent('Invalid session detected in ProtectedRoute', {
                route: location.pathname,
                userId: user.id,
                requireAdmin,
                sessionAge
              });
              setAuthError("Your session has expired. Please log in again.");
              setSecurityFailure(true);
            }
          } else {
            // For fresh sessions, assume they're valid
            setSessionValid(true);
          }
        } catch (error) {
          console.error('Session validation error:', error);
          // Only fail for very old sessions
          const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
          const sessionAge = Date.now() - sessionStart;
          
          if (sessionAge > 3600000) { // Only fail if session is older than 1 hour
            setSessionValid(false);
            setSecurityFailure(true);
            setAuthError("Session validation failed. Please log in again.");
          } else {
            setSessionValid(true);
          }
        }
      } else if (user && adminCheckCompleted) {
        // For non-admin routes, just mark as valid
        setSessionValid(true);
      }
    };

    checkSessionSecurity();
  }, [user, adminCheckCompleted, validateSession, location.pathname, requireAdmin]);

  // Clear errors when dependencies change
  useEffect(() => {
    setAuthError(null);
    setSecurityFailure(false);
    setSessionValid(null);
  }, [user, isAdmin]);

  // Show loading while authentication and session validation are in progress
  if (loading || !adminCheckCompleted || (user && requireAdmin && sessionValid === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show security error if validation failed
  if (securityFailure || sessionValid === false) {
    logSecurityEvent('Security failure in ProtectedRoute', {
      route: location.pathname,
      userId: user?.id,
      error: authError,
      requireAdmin,
    });

    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription>
            {authError || "Your session has expired. Please log in again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to /auth");
    logSecurityEvent('Unauthenticated access attempt', {
      route: location.pathname,
      requireAdmin,
    });
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Enhanced admin requirement check with better debugging
  if (requireAdmin && isAdmin !== true) {
    console.log("Access denied: Admin required but user admin status:", { 
      isAdmin, 
      userRole, 
      adminCheckCompleted,
      userId: user.id 
    });
    
    logSecurityEvent('Unauthorized admin access attempt', {
      route: location.pathname,
      userId: user.id,
      userRole,
      isAdmin,
      adminCheckCompleted,
    });
    
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Alert variant="warning" className="max-w-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have the required admin permissions to access this page.
            {isAdmin === null && " Admin status is still being verified."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle owner routes for admin users with enhanced security
  if (isAdmin && location.pathname === '/owner' && !allowAdminAccess) {
    console.log("Admin user detected on owner route, redirecting to admin dashboard");
    logSecurityEvent('Admin accessing owner route', {
      route: location.pathname,
      userId: user.id,
      redirected: true,
    });
    return <Navigate to="/" replace />;
  }

  // Log successful access for security monitoring
  logSecurityEvent('Route access granted', {
    route: location.pathname,
    userId: user.id,
    userRole,
    requireAdmin,
    isAdmin,
  });

  console.log("ProtectedRoute: Access granted", { 
    requireAdmin, 
    isAdmin, 
    userRole,
    sessionValid,
    adminCheckCompleted
  });
  
  return <>{children}</>;
};

export default ProtectedRoute;
