
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import KioskView from "./pages/KioskView";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerRestaurantManage from "./pages/OwnerRestaurantManage";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import { Toaster } from "./components/ui/sonner";
import InstallPWAPrompt from "./components/pwa/InstallPWAPrompt";

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/kiosk/:restaurantId" element={<KioskView />} />
            <Route path="/owner/login" element={<OwnerLogin />} />
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/restaurant/:restaurantId"
              element={
                <ProtectedRoute>
                  <OwnerRestaurantManage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPWAPrompt />
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
