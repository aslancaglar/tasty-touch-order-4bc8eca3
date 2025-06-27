
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted, refreshAuth } = useAuth();
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  console.log("Index render:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted,
    routingDecision 
  });

  // Show refresh button after 10 seconds of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || !adminCheckCompleted) {
        setShowRefreshButton(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [loading, adminCheckCompleted]);

  // Determine routing decision when auth state is complete
  useEffect(() => {
    // Don't make routing decisions while loading or admin check is incomplete
    if (loading || !adminCheckCompleted) {
      setRoutingDecision(null);
      return;
    }

    // No user - redirect to auth
    if (!user) {
      console.log("No authenticated user, will redirect to auth");
      setRoutingDecision("auth");
      return;
    }

    // User exists but not admin - redirect to owner page
    if (isAdmin === false) {
      console.log("User is not an admin, will redirect to owner page");
      setRoutingDecision("owner");
      return;
    }

    // User is admin - show dashboard
    if (isAdmin === true) {
      console.log("User is admin, will show dashboard");
      setRoutingDecision("dashboard");
      return;
    }

    // Fallback - still determining admin status
    console.log("Admin status still being determined");
    setRoutingDecision(null);
  }, [user, loading, isAdmin, adminCheckCompleted]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setShowRefreshButton(false);
    try {
      await refreshAuth();
    } catch (error) {
      console.error("Manual refresh failed:", error);
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
            {loading ? "Loading..." : !adminCheckCompleted ? "Verifying permissions..." : "Preparing dashboard..."}
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
      console.warn("Unexpected routing state, redirecting to auth");
      return <Navigate to="/auth" replace />;
  }
};

export default Index;
