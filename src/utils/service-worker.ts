
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
  // In a real app, show a UI notification/toast here
  console.log('New version available! Ready to update.');
  
  // For demo purposes, we'll automatically update
  if (registration.waiting) {
    registration.waiting.postMessage({ action: 'skipWaiting' });
  }
};

// Function to clear cache (can be called from UI)
export const clearServiceWorkerCache = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration && registration.active) {
      registration.active.postMessage({ action: 'clearCache' });
      console.log('Sent cache clear command to Service Worker');
      return true;
    }
  }
  return false;
};

// Function to check if the app is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Track online/offline status changes
let onlineStatusListeners: Array<(status: boolean) => void> = [];

// Function to add online status listener
export const addOnlineStatusListener = (callback: (status: boolean) => void) => {
  onlineStatusListeners.push(callback);
  // Immediately call with current status
  callback(isOnline());
};

// Function to remove online status listener
export const removeOnlineStatusListener = (callback: (status: boolean) => void) => {
  onlineStatusListeners = onlineStatusListeners.filter(listener => listener !== callback);
};

// Function to manually refresh network status
export const checkNetworkStatus = (): boolean => {
  const status = isOnline();
  onlineStatusListeners.forEach(listener => listener(status));
  return status;
};

// Enhanced function to retry a network request
export const retryNetworkRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if we're online
      if (!isOnline()) {
        throw new Error('Device is offline');
      }
      
      // Try the request
      return await requestFn();
    } catch (error) {
      console.log(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      lastError = error;
      
      // Wait before trying again (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError || new Error('Request failed after multiple attempts');
};

// Set up online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Device is now ONLINE');
    onlineStatusListeners.forEach(listener => listener(true));
  });
  
  window.addEventListener('offline', () => {
    console.log('[Network] Device is now OFFLINE');
    onlineStatusListeners.forEach(listener => listener(false));
  });
}
