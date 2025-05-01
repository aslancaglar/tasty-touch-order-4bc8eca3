
import { useState, useEffect } from 'react';

export function usePWAStatus() {
  const [isPWA, setIsPWA] = useState(false);
  
  useEffect(() => {
    // Check if the app is running in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // For iOS devices
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
    
    setIsPWA(isStandalone || isIOSStandalone);
    
    // Listen for changes in display mode
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsPWA(event.matches);
    };
    
    // Add event listener (using the correct approach based on browser support)
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleChange);
    }
    
    // Clean up
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(handleChange);
      }
    };
  }, []);
  
  return isPWA;
}
