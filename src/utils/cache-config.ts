
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";

// Configure cache behavior globally
export const initializeCacheConfig = () => {
  // Enable caching for customer-facing kiosk views
  setCachingEnabled(true);
  
  // Disable caching for admin/owner dashboards
  setCachingEnabledForAdmin(false);
  
  console.log("[CacheConfig] Initialized: Kiosk caching ENABLED, Admin caching DISABLED");
};

export default initializeCacheConfig;
