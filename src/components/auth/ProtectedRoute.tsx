
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
  
  // Track previous user ID to detect actual user changes
  const previousUserIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  console.log("ProtectedRoute:", { 
    user: !!user,
    userId: user?.id,
    previousUserId: previousUserIdRef.current,
    loading, 
    isAdmin, 
    adminCheckCompleted, 
    requireAdmin,
    allowAdminAccess,
    pathname: location.pathname,
    routingDecision,
    stableAdminStatus,
    hasInitialized: hasInitializedRef.current
  });

  // Detect if this is the same user
  const currentUserId = user?.id || null;
  const userChanged = previousUserIdRef.current !== currentUserId;
  
  // Update previous user ID reference
  useEffect(() => {
    previousUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Stabilize admin status to prevent flickering, but respect user changes
  useEffect(() => {
    if (adminCheckCompleted && isAdmin !== null) {
      // If user changed, always update stable status
      if (userChanged || !hasInitializedRef.current) {
        console.log("ProtectedRoute: Updating stable admin status due to user change or initialization", { 
          isAdmin, 
          userChanged, 
          hasInitialized: hasInitializedRef.current 
        });
        setStableAdminStatus(isAdmin);
        hasInitializedRef.current = true;
      } else {
        // For same user, check if there's a clear conflict and resolve it
        if (stableAdminStatus !== null && stableAdminStatus !== isAdmin) {
          console.log("ProtectedRoute: Resolving admin status conflict", { 
            stableAdminStatus, 
            isAdmin,
            action: "updating to current isAdmin value"
          });
          setStableAdminStatus(isAdmin);
        } else if (stableAdminStatus === null) {
          console.log("ProtectedRoute: Setting initial stable admin status", { isAdmin });
          setStableAdminStatus(isAdmin);
        } else {
          console.log("ProtectedRoute: Preserving stable admin status during tab switch", { 
            stableAdminStatus, 
            isAdmin 
          });
        }
      }
    }
  }, [isAdmin, adminCheckCompleted, userChanged, stableAdminStatus]);

  // Show refresh button after 15 seconds of loading - but only when we truly have no status info
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((loading || !adminCheckCompleted) && stableAdminStatus === null) {
        setShowRefreshButton(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading, adminCheckCompleted, stableAdminStatus]);

  // Enhanced routing decision logic with better handling of preserved admin status
  useEffect(() => {
    console.log("ProtectedRoute: Evaluating routing decision...", {
      loading,
      adminCheckCompleted,
      user: !!user,
      userChanged,
      stableAdminStatus,
      isAdmin,
      requireAdmin,
      allowAdminAccess,
      pathname: location.pathname,
      currentRoutingDecision: routingDecision
    });

    // Don't make routing decisions while loading IF we don't have any stable status
    if ((loading || !adminCheckCompleted) && stableAdminStatus === null) {
      console.log("ProtectedRoute: Still loading and no stable status, not making routing decision");
      return;
    }

    // No user - redirect to auth
    if (!user) {
      console.log("ProtectedRoute: No user, will redirect to /auth");
      setRoutingDecision("auth");
      return;
    }

    // Use stable admin status for routing decisions, with fallback to current isAdmin
    const effectiveAdminStatus = stableAdminStatus !== null ? stableAdminStatus : isAdmin;

    console.log("ProtectedRoute: Making routing decision with effective admin status", {
      effectiveAdminStatus,
      stableAdminStatus,
      isAdmin,
      userChanged,
      requireAdmin
    });

    // Admin required but user is not admin
    if (requireAdmin && effectiveAdminStatus === false) {
      console.log("ProtectedRoute: Admin required but user is not admin, will redirect to /owner");
      setRoutingDecision("owner");
      return;
    }

    // Admin user on owner route (and not allowed)
    if (effectiveAdminStatus === true && location.pathname === '/owner' && !allowAdminAccess) {
      console.log("ProtectedRoute: Admin user on owner route, will redirect to admin dashboard");
      setRoutingDecision("admin");
      return;
    }

    // Access granted
    if (effectiveAdminStatus !== null) {
      console.log("ProtectedRoute: Access granted, will show content");
      setRoutingDecision("allow");
      return;
    }

    // Admin status still being determined
    console.log("ProtectedRoute: Admin status still being determined, waiting...");
  }, [user, loading, isAdmin, adminCheckCompleted, requireAdmin, allowAdminAccess, location.pathname, stableAdminStatus, userChanged, routingDecision]);

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log("ProtectedRoute: Manual refresh triggered");
    setShowRefreshButton(false);
    setRoutingDecision(null);
    setStableAdminStatus(null); // Reset stable status on manual refresh
    hasInitializedRef.current = false;
    try {
      await refreshAuth();
    } catch (error) {
      console.error("ProtectedRoute: Manual refresh failed:", error);
      // Show refresh button again if it fails
      setTimeout(() => setShowRefreshButton(true), 2000);
    }
  };

  // Show loading spinner only when we truly don't have enough info to make a routing decision
  const shouldShowLoading = (loading || !adminCheckCompleted) && 
    stableAdminStatus === null && 
    routingDecision === null;

  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="text-gray-600">
            {loading 
              ? "Loading..." 
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
