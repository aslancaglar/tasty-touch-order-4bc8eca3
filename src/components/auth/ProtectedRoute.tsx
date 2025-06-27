
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
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
  const { user, loading, isAdmin, adminCheckCompleted, refreshAuth } = useAuth();
  const location = useLocation();
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [stableAdminStatus, setStableAdminStatus] = useState<boolean | null>(null);

  console.log("ProtectedRoute:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname,
    routingDecision,
    stableAdminStatus
  });

  // Stabilize admin status to prevent flickering
  useEffect(() => {
    if (adminCheckCompleted && isAdmin !== null) {
      setStableAdminStatus(isAdmin);
    }
  }, [isAdmin, adminCheckCompleted]);

  // Show refresh button after 15 seconds of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || !adminCheckCompleted) {
        setShowRefreshButton(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading, adminCheckCompleted]);

  // Enhanced routing decision logic with stability checks
  useEffect(() => {
    // Reset routing decision when auth state changes
    setRoutingDecision(null);

    // Don't make routing decisions while loading or admin check is incomplete
    if (loading || !adminCheckCompleted) {
      return;
    }

    // No user - redirect to auth
    if (!user) {
      console.log("ProtectedRoute: No user, will redirect to /auth");
      setRoutingDecision("auth");
      return;
    }

    // Use stable admin status for routing decisions
    const adminStatus = stableAdminStatus !== null ? stableAdminStatus : isAdmin;

    // Admin required but user is not admin
    if (requireAdmin && adminStatus === false) {
      console.log("ProtectedRoute: Admin required but user is not admin, will redirect to /owner");
      setRoutingDecision("owner");
      return;
    }

    // Admin user on owner route (and not allowed)
    if (adminStatus === true && location.pathname === '/owner' && !allowAdminAccess) {
      console.log("ProtectedRoute: Admin user on owner route, will redirect to admin dashboard");
      setRoutingDecision("admin");
      return;
    }

    // Access granted
    console.log("ProtectedRoute: Access granted, will show content");
    setRoutingDecision("allow");
  }, [user, loading, isAdmin, adminCheckCompleted, requireAdmin, allowAdminAccess, location.pathname, stableAdminStatus]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setShowRefreshButton(false);
    setRoutingDecision(null);
    try {
      await refreshAuth();
    } catch (error) {
      console.error("Manual refresh failed:", error);
      // Show refresh button again if it fails
      setTimeout(() => setShowRefreshButton(true), 2000);
    }
  };

  // Show loading spinner while determining routing
  if (loading || !adminCheckCompleted || routingDecision === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="text-gray-600">
            {loading 
              ? "Loading..." 
              : !adminCheckCompleted 
                ? "Verifying authentication..." 
                : "Preparing content..."
            }
          </p>
          {showRefreshButton && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Taking longer than expected?</p>
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Authentication
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Execute routing decision
  switch (routingDecision) {
    case "auth":
      return <Navigate to="/auth" state={{ from: location }} replace />;
    case "owner":
      return <Navigate to="/owner" replace />;
    case "admin":
      return <Navigate to="/" replace />;
    case "allow":
      return <>{children}</>;
    default:
      // Fallback to auth
      console.warn("ProtectedRoute: Unexpected routing state, redirecting to auth");
      return <Navigate to="/auth" state={{ from: location }} replace />;
  }
};

export default ProtectedRoute;
