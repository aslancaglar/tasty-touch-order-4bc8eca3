
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted, refreshAuth } = useAuth();
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);
  const [stableAdminStatus, setStableAdminStatus] = useState<boolean | null>(null);
  
  // Track previous user ID to detect actual user changes
  const previousUserIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  console.log("Index render:", { 
    user: !!user, 
    userId: user?.id,
    previousUserId: previousUserIdRef.current,
    loading, 
    isAdmin, 
    adminCheckCompleted,
    routingDecision,
    stableAdminStatus,
    hasInitialized: hasInitializedRef.current
  });

  // Detect if this is the same user (to prevent routing resets during tab switches)
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
        console.log("Index: Updating stable admin status due to user change or initialization", { 
          isAdmin, 
          userChanged, 
          hasInitialized: hasInitializedRef.current 
        });
        setStableAdminStatus(isAdmin);
        hasInitializedRef.current = true;
      } else {
        // For same user, only update if we don't have a stable status yet
        if (stableAdminStatus === null) {
          console.log("Index: Setting initial stable admin status", { isAdmin });
          setStableAdminStatus(isAdmin);
        } else {
          console.log("Index: Preserving stable admin status during tab switch", { 
            stableAdminStatus, 
            isAdmin 
          });
        }
      }
    }
  }, [isAdmin, adminCheckCompleted, userChanged, stableAdminStatus]);

  // Show refresh button after 15 seconds of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || !adminCheckCompleted) {
        setShowRefreshButton(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [loading, adminCheckCompleted]);

  // Enhanced routing decision logic with better handling of preserved admin status
  useEffect(() => {
    console.log("Index: Evaluating routing decision...", {
      loading,
      adminCheckCompleted,
      user: !!user,
      userChanged,
      stableAdminStatus,
      isAdmin,
      currentRoutingDecision: routingDecision
    });

    // Don't make routing decisions while loading or admin check is incomplete
    if (loading || !adminCheckCompleted) {
      console.log("Index: Still loading or admin check incomplete, not making routing decision");
      return;
    }

    // No user - redirect to auth (always reset routing decision for this)
    if (!user) {
      console.log("Index: No authenticated user, will redirect to auth");
      setRoutingDecision("auth");
      return;
    }

    // For same user with existing routing decision, preserve it unless there's a compelling reason to change
    if (!userChanged && routingDecision && stableAdminStatus !== null) {
      // Check if current routing decision is still valid
      const shouldPreserveRouting = 
        (routingDecision === "dashboard" && stableAdminStatus === true) ||
        (routingDecision === "owner" && stableAdminStatus === false);
      
      if (shouldPreserveRouting) {
        console.log("Index: Preserving existing routing decision for same user", { 
          routingDecision, 
          stableAdminStatus 
        });
        return;
      }
    }

    // Use stable admin status for routing decisions, with fallback to current isAdmin
    const effectiveAdminStatus = stableAdminStatus !== null ? stableAdminStatus : isAdmin;

    console.log("Index: Making routing decision with effective admin status", {
      effectiveAdminStatus,
      stableAdminStatus,
      isAdmin,
      userChanged
    });

    // User exists but not admin - redirect to owner page
    if (effectiveAdminStatus === false) {
      console.log("Index: User is not an admin, will redirect to owner page");
      setRoutingDecision("owner");
      return;
    }

    // User is admin - show dashboard
    if (effectiveAdminStatus === true) {
      console.log("Index: User is admin, will show dashboard");
      setRoutingDecision("dashboard");
      return;
    }

    // Admin status still being determined - don't change routing decision yet
    console.log("Index: Admin status still being determined, waiting...");
  }, [user, loading, isAdmin, adminCheckCompleted, stableAdminStatus, userChanged, routingDecision]);

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log("Index: Manual refresh triggered");
    setShowRefreshButton(false);
    setRoutingDecision(null);
    setStableAdminStatus(null); // Reset stable status on manual refresh
    hasInitializedRef.current = false;
    try {
      await refreshAuth();
    } catch (error) {
      console.error("Index: Manual refresh failed:", error);
      // Show refresh button again if it fails
      setTimeout(() => setShowRefreshButton(true), 2000);
    }
  };

  // Show loading state until routing decision is made
  if (loading || !adminCheckCompleted || routingDecision === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="text-gray-600">
            {loading 
              ? "Loading..." 
              : !adminCheckCompleted 
                ? "Verifying permissions..." 
                : "Preparing dashboard..."
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
      return <Navigate to="/auth" replace />;
    case "owner":
      return <Navigate to="/owner" replace />;
    case "dashboard":
      return <Dashboard />;
    default:
      // This should not happen, but provide a fallback
      console.warn("Index: Unexpected routing state, redirecting to auth");
      return <Navigate to="/auth" replace />;
  }
};

export default Index;
