import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import SecurityMonitor from "@/components/security/SecurityMonitor";
import { securityHeaders } from "@/utils/security-headers";
import { logSecurityEventAudit } from "@/utils/audit-logger";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";
import RestaurantDashboard from "./pages/RestaurantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RestaurantSettings from "./pages/RestaurantSettings";
import MenuSettings from "./pages/MenuSettings";
import OrderManagement from "./pages/OrderManagement";
import Restaurants from "./pages/Restaurants";
import Kiosk from "./pages/Kiosk";
import NotFound from "./pages/NotFound";
import { registerServiceWorker } from "@/utils/service-worker";
import { useEffect } from "react";

// Initialize security headers and CSP
if (typeof window !== 'undefined') {
  securityHeaders.applyCSP();
  logSecurityEventAudit('Application initialized', undefined, {
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Log failed queries for security monitoring
        logSecurityEventAudit('Query failed', undefined, {
          failureCount,
          error: String(error),
          maxRetries: 3
        });
        return failureCount < 3;
      },
    },
  },
});

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SecurityProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <SecurityMonitor />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/owner/login" element={<OwnerLogin />} />
                <Route path="/owner" element={<OwnerDashboard />} />
                <Route path="/restaurants" element={<Restaurants />} />
                <Route path="/restaurant/:restaurantId" element={<RestaurantDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/restaurant/:restaurantId/settings" element={<RestaurantSettings />} />
                <Route path="/restaurant/:restaurantId/menu" element={<MenuSettings />} />
                <Route path="/restaurant/:restaurantId/orders" element={<OrderManagement />} />
                <Route path="/kiosk/:restaurantSlug" element={<Kiosk />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SecurityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
