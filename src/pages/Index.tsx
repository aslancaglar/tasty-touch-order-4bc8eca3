
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);

  console.log("Index render:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted,
    routingDecision 
  });

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

  // Show loading state until routing decision is made
  if (loading || !adminCheckCompleted || routingDecision === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading..." : !adminCheckCompleted ? "Verifying permissions..." : "Preparing dashboard..."}
          </p>
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
