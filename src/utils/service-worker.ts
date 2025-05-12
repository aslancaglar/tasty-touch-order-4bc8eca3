
import { toast } from "../components/ui/use-toast";

// Cache status tracking
interface CacheStatus {
  lastUpdated: {
    [key: string]: number; // URL -> timestamp mapping
  };
  refreshing: {
    [key: string]: boolean; // URL -> is currently refreshing
  };
}

let cacheStatus: CacheStatus = {
  lastUpdated: {},
  refreshing: {}
};

// Event listeners for cache updates from the service worker
if (typeof window !== 'undefined') {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'CACHE_UPDATED') {
      const url = event.data.url;
      cacheStatus.lastUpdated[url] = Date.now();
      cacheStatus.refreshing[url] = false;
      
      // Optional: notify user about background update
      // toast({ description: "Content updated in the background", duration: 3000 });
      
      // Dispatch an event that components can listen for
      window.dispatchEvent(new CustomEvent('cache-updated', { detail: { url } }));
    }
    
    if (event.data.type === 'CACHE_CLEARED') {
      cacheStatus = { lastUpdated: {}, refreshing: {} };
      toast({ description: "Cache cleared successfully", duration: 3000 });
      
      // Dispatch event for cache clear
      window.dispatchEvent(new CustomEvent('cache-cleared'));
    }
    
    if (event.data.type === 'CACHE_REFRESHED') {
      const urls = event.data.urls || [];
      urls.forEach((url: string) => {
        cacheStatus.lastUpdated[url] = Date.now();
        cacheStatus.refreshing[url] = false;
      });
      
      toast({ description: "Content refreshed successfully", duration: 3000 });
      
      // Dispatch event for refreshed content
      window.dispatchEvent(new CustomEvent('cache-refreshed', { detail: { urls } }));
    }
  });
}

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Check if there's a waiting worker and notify the user
          if (registration.waiting) {
            notifyUpdateAvailable(registration);
          }
          
          // Detect controller change and reload the page
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New content is available, notify user
                    notifyUpdateAvailable(registration);
                  }
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
};

// Function to notify user about update and prompt them to reload
const notifyUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  toast({
    title: "Application Update",
    description: "New version available! Ready to update.",
    action: (
      <button 
        className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium"
        onClick={() => {
          if (registration.waiting) {
            registration.waiting.postMessage({ action: 'skipWaiting' });
          }
        }}
      >
        Update
      </button>
    ),
    duration: 10000
  });
};

// Function to clear service worker cache
export const clearServiceWorkerCache = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.active) {
      registration.active.postMessage({ action: 'clearCache' });
      console.log('Sent cache clear command to Service Worker');
      toast({ description: "Clearing cache...", duration: 3000 });
    }
  }
};

// Function to force refresh specific URLs in the cache
export const forceRefreshCache = async (urls: string[] = []) => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.active) {
      // Mark these URLs as refreshing
      urls.forEach(url => {
        cacheStatus.refreshing[url] = true;
      });
      
      registration.active.postMessage({ 
        action: 'forceRefresh',
        urls: urls
      });
      
      console.log('Sent force refresh command to Service Worker for:', urls);
      toast({ description: "Refreshing content...", duration: 3000 });
      return true;
    }
  }
  return false;
};

// Function to check if the app is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Function to get cache staleness for a URL (returns milliseconds since last update)
export const getCacheStaleness = (url: string): number | null => {
  const lastUpdated = cacheStatus.lastUpdated[url];
  if (!lastUpdated) return null;
  
  return Date.now() - lastUpdated;
};

// Function to check if a URL is currently being refreshed
export const isRefreshing = (url: string): boolean => {
  return !!cacheStatus.refreshing[url];
};

// Track online/offline status changes
let onlineStatusListeners: Array<(status: boolean) => void> = [];

// Function to add online status listener
export const addOnlineStatusListener = (callback: (status: boolean) => void) => {
  onlineStatusListeners.push(callback);
};

// Function to remove online status listener
export const removeOnlineStatusListener = (callback: (status: boolean) => void) => {
  onlineStatusListeners = onlineStatusListeners.filter(listener => listener !== callback);
};

// Set up online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    onlineStatusListeners.forEach(listener => listener(true));
  });
  
  window.addEventListener('offline', () => {
    onlineStatusListeners.forEach(listener => listener(false));
  });
}

// Create a custom fetch wrapper that uses the cache-first approach
export const cacheFriendlyFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // Clone options to avoid mutating the original
  const fetchOptions = { ...options };
  
  // Create headers if they don't exist
  if (!fetchOptions.headers) {
    fetchOptions.headers = {};
  }
  
  // Force refresh if requested
  if (fetchOptions.cache === 'reload') {
    (fetchOptions.headers as Record<string, string>)['x-force-refresh'] = 'true';
    delete fetchOptions.cache; // Remove cache option as we handle it via headers
  }
  
  try {
    // Use the standard fetch API with our modified options
    const response = await fetch(url, fetchOptions);
    
    // Update our cache status tracking
    if (response.ok) {
      cacheStatus.lastUpdated[url] = Date.now();
      cacheStatus.refreshing[url] = false;
    }
    
    return response;
  } catch (error) {
    cacheStatus.refreshing[url] = false;
    throw error;
  }
};
