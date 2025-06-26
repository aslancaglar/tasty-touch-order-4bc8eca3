
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();

  console.log("Index render:", { user: !!user, loading, isAdmin, adminCheckCompleted });

  // Display loading state until both authentication and admin check are complete
  if (loading || !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log("No authenticated user, redirecting to auth");
    return <Navigate to="/auth" />;
  }

  // If user is not an admin, redirect to owner page
  if (user && isAdmin === false) {
    console.log("User is not an admin, redirecting to owner page");
    return <Navigate to="/owner" />;
  }

  // User is admin, render Dashboard
  console.log("User is admin, rendering Dashboard");
  return <Dashboard />;
};

export default Index;
