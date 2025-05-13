
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
  
  try {
    // Register service worker for offline capabilities
    registerServiceWorker();
    console.log("[CacheConfig] Service worker registered successfully");
  } catch (error) {
    console.error("[CacheConfig] Failed to register service worker:", error);
  }
  
  console.log("[CacheConfig] Initialized: Kiosk caching ENABLED, Admin caching DISABLED");
  
  return {
    online,
    cachingEnabled: true,
    adminCachingEnabled: false
  };
};

// Add a new function to handle failed cache operations with better error messages
export const handleCacheError = (operation: string, error: any): string => {
  console.error(`[CacheConfig] Error during ${operation}:`, error);
  
  const online = isOnline();
  let errorMessage = `Failed to ${operation.toLowerCase()}`;
  
  if (!online) {
    errorMessage += ". You appear to be offline. Please check your internet connection and try again.";
  } else if (error.message) {
    // Clean up the error message for user display
    const cleanedMessage = error.message
      .replace(/^Error:\s*/i, '')
      .replace(/\b(?:supabase|api|http|endpoint|auth)\b/gi, 'server');
    errorMessage += `: ${cleanedMessage}`;
  }
  
  return errorMessage;
};

export default initializeCacheConfig;
