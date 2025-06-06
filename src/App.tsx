
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { NetworkStatus } from "@/components/ui/network-status";
import SecurityMonitor from "@/components/security/SecurityMonitor";
import { initializeCacheConfig } from "@/utils/cache-config";

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
    },
  },
});

// Lazy load pages
import Dashboard from "./pages/Dashboard";
import Restaurants from "./pages/Restaurants";
import RestaurantManage from "./pages/RestaurantManage";
import KioskView from "./pages/KioskView";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerRestaurantManage from "./pages/OwnerRestaurantManage";
import OwnerLogin from "./pages/OwnerLogin";
import Index from "./pages/Index";

const App = () => {
  // Initialize cache config when the app starts
  useEffect(() => {
    initializeCacheConfig();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            
            <SecurityMonitor />
            
            <div className="fixed bottom-4 right-4 z-50">
              <NetworkStatus showLabel={true} />
            </div>
            
            <Routes>
              {/* Auth Routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/owner/login" element={<OwnerLogin />} />
              
              {/* Admin Routes - Protected and require admin role */}
              <Route path="/" element={
                <ProtectedRoute requireAdmin={true}>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/restaurants" element={
                <ProtectedRoute requireAdmin={true}>
                  <Restaurants />
                </ProtectedRoute>
              } />
              <Route path="/restaurant/:id" element={
                <ProtectedRoute requireAdmin={true}>
                  <RestaurantManage />
                </ProtectedRoute>
              } />
              
              {/* Restaurant Owner Routes */}
              <Route path="/owner" element={
                <ProtectedRoute>
                  <OwnerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/owner/restaurant/:id" element={
                <ProtectedRoute>
                  <OwnerRestaurantManage />
                </ProtectedRoute>
              } />
              
              {/* Public Kiosk Routes */}
              <Route path="/r/:restaurantSlug" element={<KioskView />} />
              
              {/* Catch-all Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
