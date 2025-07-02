
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();

  console.log("Index render:", { 
    user: !!user, 
    loading, 
    isAdmin, 
    adminCheckCompleted
  });

  // Add debug log to see if we reach this component at all
  console.log("Index component mounted");

  // Show loading state while auth is being determined
  if (loading || !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Loading..." : "Verifying permissions..."}
          </p>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log("No authenticated user, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  // User exists but not admin - redirect to owner page
  if (isAdmin === false) {
    console.log("User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" replace />;
  }

  // User is admin - show dashboard
  if (isAdmin === true) {
    console.log("User is admin, showing dashboard");
    return <Dashboard />;
  }

  // Fallback - this should not happen with the current logic
  console.warn("Unexpected auth state, redirecting to auth");
  return <Navigate to="/auth" replace />;
};

export default Index;
