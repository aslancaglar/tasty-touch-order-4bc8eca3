// Service Worker for Tasty Touch - Restaurant Kiosk App
const CACHE_VERSION = 'v2';
const CACHE_NAME = `tasty-touch-cache-${CACHE_VERSION}`;
const APP_SHELL_CACHE = 'app-shell';
const DATA_CACHE = 'app-data';
const IMG_CACHE = 'image-cache';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Resources that should be pre-cached (app shell)
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/placeholder.svg',
  '/src/main.tsx',
  '/src/index.css',
  '/offline.html',
];

// Install event - Cache app shell resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  self.skipWaiting(); // Force activation on older versions
  
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => {
        console.log('[Service Worker] Pre-caching app shell');
        return cache.addAll(APP_SHELL_FILES);
      })
      .catch(err => {
        console.error('[Service Worker] Pre-cache failed:', err);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Clean up outdated caches
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          // If a cache name doesn't match our current version, delete it
          if (key !== APP_SHELL_CACHE && key !== DATA_CACHE && key !== IMG_CACHE) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        }));
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim(); // Take control of clients immediately
      })
  );
});

// Helper function to determine if a request is for an image
const isImageRequest = (url) => {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || 
         url.href.includes('storage/v1/object');
};

// Helper function to determine if a request is for API data
const isApiRequest = (url) => {
  // Adjust these paths based on your actual API endpoints
  return url.pathname.includes('/api/') || 
         url.href.includes('supabase') || 
         url.href.includes('rest/v1');
};

// Helper to check if cache is stale
const isCacheStale = (response) => {
  if (!response || !response.headers || !response.headers.get('date')) {
    return true; // If no timestamp, consider it stale
  }
  
  const cachedDate = new Date(response.headers.get('date')).getTime();
  return Date.now() - cachedDate > CACHE_MAX_AGE;
};

// Fetch event - Use stale-while-revalidate for most requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      url.origin !== location.origin && !url.href.includes('supabase')) {
    return;
  }

  // Different strategies based on request type
  if (isImageRequest(url)) {
    // Cache-first strategy for images with background refresh if stale
    event.respondWith(staleWhileRevalidateStrategy(event.request, IMG_CACHE));
  } else if (isApiRequest(url)) {
    // Stale-while-revalidate for API data
    event.respondWith(staleWhileRevalidateStrategy(event.request, DATA_CACHE));
  } else {
    // Cache-first for app shell (static resources)
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

// Cache-first strategy: Try cache first, then network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Return cached response immediately
    return cachedResponse;
  }
  
  // If not in cache, fetch from network and cache it
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (err) {
    // If HTML request fails and we're offline, show offline page
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw err;
  }
}

// Stale-while-revalidate: Return cached data immediately, then update cache in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  // Try to get from cache first
  const cachedResponse = await caches.match(request);
  
  // Start updating cache in background if we have a cached response
  const updateCachePromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse && networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        // Store with timestamp
        const responseToCache = networkResponse.clone();
        cache.put(request, responseToCache);
        
        // Notify clients that cache was updated
        notifyClientsOfUpdate(request.url);
      }
      return networkResponse;
    })
    .catch(err => {
      console.log('[Service Worker] Fetch failed:', err);
      // No need to do anything, we already returned the cached response
    });
  
  // If we have a cached response, return it immediately and update in background
  if (cachedResponse) {
    // If forced refresh header is present, wait for network
    if (request.headers.get('x-force-refresh')) {
      try {
        return await updateCachePromise;
      } catch (error) {
        return cachedResponse; // Fallback to cache if network fails
      }
    }
    
    // Otherwise return cached response immediately
    // And update cache in background
    updateCachePromise;
    return cachedResponse;
  }
  
  // If no cache, wait for network response
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (err) {
    // If no cache and network fails, try to return appropriate fallback
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    
    throw err;
  }
}

// Helper function to notify clients about cache updates
function notifyClientsOfUpdate(url) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        url: url
      });
    });
  });
}

// Background sync for offline actions (like placing an order)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Function to sync any pending orders when back online
async function syncOrders() {
  // Implementation will depend on how you store pending orders
  console.log('[Service Worker] Syncing pending orders');
  // This would be implemented with IndexedDB in a more complete solution
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data.action === 'clearCache') {
    clearAllCaches();
  }
  
  if (event.data.action === 'forceRefresh') {
    // Force refresh of specific URL(s)
    if (event.data.urls && Array.isArray(event.data.urls)) {
      refreshCachedUrls(event.data.urls);
    }
  }
});

// Function to clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    console.log('[Service Worker] All caches cleared!');
    
    // Notify clients about the cache clear
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_CLEARED'
        });
      });
    });
  } catch (err) {
    console.error('[Service Worker] Failed to clear caches:', err);
  }
}

// Function to refresh specific cached URLs
async function refreshCachedUrls(urls) {
  try {
    // Try to refresh each URL
    const refreshPromises = urls.map(async (url) => {
      const request = new Request(url);
      const response = await fetch(request);
      
      if (!response || response.status !== 200) {
        return false;
      }
      
      // Determine which cache to use
      let cacheName = APP_SHELL_CACHE;
      if (isImageRequest(new URL(url))) {
        cacheName = IMG_CACHE;
      } else if (isApiRequest(new URL(url))) {
        cacheName = DATA_CACHE;
      }
      
      // Update the cache
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      
      return true;
    });
    
    await Promise.all(refreshPromises);
    console.log('[Service Worker] Forced refresh complete for URLs:', urls);
    
    // Notify clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_REFRESHED',
          urls: urls
        });
      });
    });
  } catch (err) {
    console.error('[Service Worker] Forced refresh failed:', err);
  }
}
