
import { setCachingEnabled, setCachingEnabledForAdmin } from "@/services/cache-service";
import { isOnline, registerServiceWorker } from "@/utils/service-worker";

// Configure cache behavior globally
export const initializeCacheConfig = () => {
  console.log("[CacheConfig] Initializing cache configuration...");
  
  // Check online status when initializing
  const online = isOnline();
  console.log(`[CacheConfig] Network status: ${online ? 'ONLINE' : 'OFFLINE'}`);
  
  // Enable caching for customer-facing kiosk views
  setCachingEnabled(true);
  
  // Disable caching for admin/owner dashboards
  setCachingEnabledForAdmin(false);
  
  // Register service worker for offline capabilities
  registerServiceWorker();
  
  console.log("[CacheConfig] Initialized: Kiosk caching ENABLED, Admin caching DISABLED");
};

export default initializeCacheConfig;
