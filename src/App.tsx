
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Kiosk from "./pages/Kiosk";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NetworkErrorBoundary from "./components/error/NetworkErrorBoundary";
import SecurityValidationWrapper from "./components/security/SecurityValidationWrapper";
import SecurityMonitor from "./components/security/SecurityMonitor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <NetworkErrorBoundary>
              <SecurityValidationWrapper
                enableInputValidation={true}
                enableRateLimit={true}
                enableSecurityMonitoring={true}
              >
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route
                    path="/admin/*"
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/kiosk/:slug" element={<Kiosk />} />
                </Routes>
                <SecurityMonitor />
              </SecurityValidationWrapper>
            </NetworkErrorBoundary>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
