
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

// Retry a network request with exponential backoff
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
      
      return await requestFn();
    } catch (error) {
      lastError = error;
      retries++;
      
      // If we've used all retries, throw the error
      if (retries >= maxRetries) {
        break;
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
