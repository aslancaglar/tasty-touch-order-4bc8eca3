
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
    // Reset routing decision when auth state changes
    setRoutingDecision(null);
    
    // Don't make routing decisions while loading or admin check is incomplete
    if (loading || !adminCheckCompleted) {
      console.log("Index: Still loading or admin check incomplete");
      return;
    }

    // No user - redirect to auth
    if (!user) {
      console.log("Index: No authenticated user, will redirect to auth");
      setRoutingDecision("auth");
      return;
    }

    // Admin check completed - make routing decision based on admin status
    if (isAdmin === true) {
      console.log("Index: User is admin, will show dashboard");
      setRoutingDecision("dashboard");
      return;
    }
    
    if (isAdmin === false) {
      console.log("Index: User is not admin, will redirect to owner page");
      setRoutingDecision("owner");
      return;
    }

    // This should not happen if adminCheckCompleted is true
    console.warn("Index: Admin status is null but adminCheckCompleted is true");
    setRoutingDecision("auth");
  }, [user, loading, isAdmin, adminCheckCompleted]);

  // Show loading state until routing decision is made
  if (loading || !adminCheckCompleted || routingDecision === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading 
              ? "Loading..." 
              : !adminCheckCompleted 
                ? "Verifying permissions..." 
                : "Preparing dashboard..."
            }
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
      console.warn("Index: Unexpected routing state, redirecting to auth");
      return <Navigate to="/auth" replace />;
  }
};

export default Index;
