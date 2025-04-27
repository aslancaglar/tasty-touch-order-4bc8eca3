
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Menu from "@/pages/Menu";
import KioskView from "@/pages/KioskView";
import NotFound from "@/pages/NotFound";
import Restaurants from "@/pages/Restaurants";
import RestaurantManage from "@/pages/RestaurantManage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { CartProvider } from "@/contexts/CartContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { AuthProvider } from "@/contexts/AuthContext";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <RestaurantProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
              <Route path="/restaurants" element={<ProtectedRoute><Restaurants /></ProtectedRoute>} />
              <Route path="/restaurants/:id" element={<ProtectedRoute><RestaurantManage /></ProtectedRoute>} />
              <Route path="/kiosk/:restaurantSlug" element={<KioskView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster position="top-right" />
          </CartProvider>
        </RestaurantProvider>
      </Router>
    </AuthProvider>
  );
}

export default App;
