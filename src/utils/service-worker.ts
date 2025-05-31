
// Check if the browser is online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Register service worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.info('Service Worker registered with scope:', registration.scope);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Online status listener management
type OnlineStatusListener = (status: boolean) => void;
const listeners: OnlineStatusListener[] = [];

// Add a listener for online status changes
export function addOnlineStatusListener(listener: OnlineStatusListener): void {
  listeners.push(listener);
  
  // If this is the first listener, set up the event handlers
  if (listeners.length === 1) {
    window.addEventListener('online', () => notifyListeners(true));
    window.addEventListener('offline', () => notifyListeners(false));
  }
  
  // Immediately notify with current status
  listener(isOnline());
}

// Remove a listener
export function removeOnlineStatusListener(listener: OnlineStatusListener): void {
  const index = listeners.indexOf(listener);
  if (index !== -1) {
    listeners.splice(index, 1);
  }
  
  // If no more listeners, remove event handlers
  if (listeners.length === 0) {
    window.removeEventListener('online', () => notifyListeners(true));
    window.removeEventListener('offline', () => notifyListeners(false));
  }
}

// Notify all listeners of status change
function notifyListeners(status: boolean): void {
  listeners.forEach(listener => listener(status));
}

// Enhanced network connectivity test
export async function testNetworkConnectivity(): Promise<boolean> {
  if (!isOnline()) {
    return false;
  }
  
  try {
    // Test with a lightweight request
    const response = await fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    console.warn('[NetworkTest] Connectivity test failed:', error);
    return false;
  }
}

// Retry a network request with exponential backoff and enhanced error handling
export async function retryNetworkRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 300
): Promise<T> {
  let lastError: any;
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Check if we're online before attempting request
      if (!isOnline()) {
        throw new Error('Network offline. Cannot complete request.');
      }
      
      console.log(`[RetryRequest] Attempt ${retries + 1}/${maxRetries}`);
      return await requestFn();
    } catch (error) {
      lastError = error;
      retries++;
      
      // If we've used all retries, throw the error
      if (retries >= maxRetries) {
        break;
      }
      
      // Check if this is a network-related error that's worth retrying
      const isNetworkError = error instanceof TypeError || 
                            (error as any)?.name === 'NetworkError' ||
                            (error as any)?.code === 'NETWORK_ERROR' ||
                            !isOnline();
      
      if (!isNetworkError) {
        // Don't retry non-network errors (like 404, 400, etc.)
        console.log(`[RetryRequest] Non-network error, not retrying:`, error);
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, retries - 1) + Math.random() * 100;
      console.log(`[RetryRequest] Attempt ${retries} failed, retrying in ${delay.toFixed(0)}ms...`);
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`[RetryRequest] All ${maxRetries} attempts failed:`, lastError);
  throw lastError || new Error('Network request failed after multiple retries');
}

// Queue for offline requests
interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  timestamp: number;
  retries: number;
}

class OfflineRequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  
  add(fn: () => Promise<any>): string {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const request: QueuedRequest = {
      id,
      fn,
      timestamp: Date.now(),
      retries: 0
    };
    
    this.queue.push(request);
    console.log(`[OfflineQueue] Added request ${id} to queue. Queue size: ${this.queue.length}`);
    
    // Try to process immediately if online
    if (isOnline()) {
      this.processQueue();
    }
    
    return id;
  }
  
  async processQueue(): Promise<void> {
    if (this.isProcessing || !isOnline() || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    console.log(`[OfflineQueue] Processing ${this.queue.length} queued requests`);
    
    while (this.queue.length > 0 && isOnline()) {
      const request = this.queue.shift()!;
      
      try {
        await request.fn();
        console.log(`[OfflineQueue] Successfully processed request ${request.id}`);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to process request ${request.id}:`, error);
        
        // Retry up to 3 times
        if (request.retries < 3) {
          request.retries++;
          this.queue.unshift(request); // Put back at front
          console.log(`[OfflineQueue] Retrying request ${request.id} (attempt ${request.retries})`);
        } else {
          console.error(`[OfflineQueue] Giving up on request ${request.id} after 3 retries`);
        }
      }
    }
    
    this.isProcessing = false;
  }
  
  getQueueSize(): number {
    return this.queue.length;
  }
  
  clearQueue(): void {
    this.queue = [];
    console.log('[OfflineQueue] Queue cleared');
  }
}

export const offlineRequestQueue = new OfflineRequestQueue();

// Start processing queue when coming back online
window.addEventListener('online', () => {
  console.log('[ServiceWorker] Back online, processing queued requests');
  offlineRequestQueue.processQueue();
});
