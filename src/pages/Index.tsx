
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();

  console.log("Index component render:", { 
    user: !!user, 
    userEmail: user?.email,
    loading, 
    isAdmin, 
    adminCheckCompleted,
    timestamp: new Date().toISOString()
  });

  // Show loading state while auth is being determined
  if (loading || !adminCheckCompleted) {
    console.log("Index: Showing loading state - auth still being determined");
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading 
              ? "Loading..." 
              : "Verifying permissions..."
            }
          </p>
        </div>
      </div>
    );
  }

  // No user - redirect to auth
  if (!user) {
    console.log("Index: No authenticated user, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // User exists and admin check is complete
  if (isAdmin === true) {
    console.log("Index: User is admin, showing Dashboard component");
    return <Dashboard />;
  }
  
  if (isAdmin === false) {
    console.log("Index: User is not admin, redirecting to /owner");
    return <Navigate to="/owner" replace />;
  }

  // This should not happen if adminCheckCompleted is true
  console.warn("Index: Unexpected state - adminCheckCompleted is true but isAdmin is null");
  return <Navigate to="/auth" replace />;
};

export default Index;
