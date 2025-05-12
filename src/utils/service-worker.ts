
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
    }
  }
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
