// Service Worker for Tasty Touch - Restaurant Kiosk App
const CACHE_VERSION = 'v2';
const CACHE_NAME = `tasty-touch-cache-${CACHE_VERSION}`;
const APP_SHELL_CACHE = 'app-shell';
const DATA_CACHE = 'app-data';

// Resources that should be pre-cached (app shell)
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/placeholder.svg',
  '/src/main.tsx',
  '/src/index.css',
  '/offline.html',  // Add offline.html to the app shell
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
          if (key !== APP_SHELL_CACHE && key !== DATA_CACHE) {
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
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
};

// Helper function to determine if a request is for API data
const isApiRequest = (url) => {
  // Adjust these paths based on your actual API endpoints
  return url.pathname.includes('/api/') || 
         url.href.includes('supabase');
};

// Helper function to determine if a request is for an HTML page
const isHtmlRequest = (request) => {
  return request.headers.get('accept')?.includes('text/html');
};

// Fetch event - Handle network requests with appropriate cache strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      url.origin !== location.origin && !url.href.includes('supabase')) {
    return;
  }

  // Different strategies based on request type
  if (isImageRequest(url)) {
    // Cache-first strategy for images
    event.respondWith(cacheFirstStrategy(event.request));
  } else if (isApiRequest(url)) {
    // Network-first for API requests with graceful fallback
    event.respondWith(networkFirstWithFallback(event.request));
  } else if (isHtmlRequest(event.request)) {
    // Network-first for HTML pages with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(event.request));
  } else {
    // Cache-first for app shell (static resources)
    event.respondWith(cacheFirstStrategy(event.request));
  }
});

// Cache-first strategy: Try cache first, then network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Return cached response and update cache in background
    fetchAndUpdateCache(request);
    return cachedResponse;
  }
  
  // If not in cache, fetch from network and cache it
  return fetchAndUpdateCache(request);
}

// Network-first with fallback: Try network first, fall back to cache with proper error handling
async function networkFirstWithFallback(request) {
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request.clone());
    
    // If successful, update cache and return response
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network request was not successful, try cache
    throw new Error('Network response was not ok');
  } catch (err) {
    console.log('[Service Worker] Network request failed, falling back to cache for:', request.url);
    
    // Look for a cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached version but inform the client it's stale
      const clonedResponse = cachedResponse.clone();
      const body = await clonedResponse.json();
      
      // Add a flag to indicate this is cached data
      body._fromCache = true;
      body._cacheTimestamp = Date.now();
      
      return new Response(JSON.stringify(body), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'true',
          'X-Cache-Date': new Date().toISOString(),
        }
      });
    }
    
    // If nothing in cache, return a friendly error
    return new Response(JSON.stringify({
      error: 'Failed to refresh data. Network request failed and no cached data available.',
      status: 503,
      _isOffline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network-first with offline fallback: Try network, fall back to cache or offline page
async function networkFirstWithOfflineFallback(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache the response if valid
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (err) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache for this HTML request, show offline fallback
    if (isHtmlRequest(request)) {
      return caches.match('/offline.html');
    }
    
    // Otherwise just return an error response
    return new Response('Network error: Unable to fetch required resource', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Helper function to fetch and update cache
async function fetchAndUpdateCache(request) {
  const cacheName = isImageRequest(new URL(request.url)) ? 
    'image-cache' : DATA_CACHE;

  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response && response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
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
});

// Function to clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(name => caches.delete(name))
    );
    console.log('[Service Worker] All caches cleared!');
  } catch (err) {
    console.error('[Service Worker] Failed to clear caches:', err);
  }
}

// New function to respond to connectivity changes
self.addEventListener('online', () => {
  console.log('[Service Worker] Browser is online, syncing data');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ONLINE_STATUS_CHANGE',
        online: true
      });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('[Service Worker] Browser is offline, using cached data');
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'ONLINE_STATUS_CHANGE',
        online: false
      });
    });
  });
});
