
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import { Loader2 } from "lucide-react";
import { setCachingEnabledForAdmin } from "@/services/cache-service";
import { useEffect } from "react";
import { isOnline } from "@/utils/service-worker";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading, isAdmin, adminCheckCompleted } = useAuth();
  const { toast } = useToast();

  // Configure caching for admin dashboard
  useEffect(() => {
    const online = isOnline();
    
    // Disable admin caching for real-time data
    setCachingEnabledForAdmin(false);
    console.log(`[Index] ${new Date().toISOString()} - Disabled caching for admin routes`);
    
    // Warn if offline
    if (!online) {
      toast({
        title: "You're offline",
        description: "Admin dashboard requires internet connectivity for full functionality",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [toast]);

  console.log(`[Index] ${new Date().toISOString()} - Render - Loading:`, loading, "AdminCheckCompleted:", adminCheckCompleted, "User:", !!user, "IsAdmin:", isAdmin);

  // Show loading during auth verification
  if (loading || !adminCheckCompleted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-700 mx-auto" />
          <p className="mt-4 text-gray-600">
            {loading ? "Verifying authentication..." : "Checking admin permissions..."}
          </p>
          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  // This component should only render for admin users
  // Route protection is handled by App.tsx
  console.log(`[Index] ${new Date().toISOString()} - Rendering Dashboard for admin user`);
  return <Dashboard />;
};

export default Index;
