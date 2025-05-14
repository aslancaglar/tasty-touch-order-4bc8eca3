
import { useState, useEffect } from "react";

/**
 * Custom hook that provides a delayed loading state.
 * This helps avoid brief loading flashes and provides a way to 
 * show different UI after a specific timeout.
 * 
 * @param initialLoadingState - Initial loading state
 * @param timeoutDuration - Duration in ms before timeout
 * @returns Object with loading state and timeout state
 */
export function useDelayedLoading(
  initialLoadingState: boolean = true, 
  timeoutDuration: number = 8000
) {
  const [isLoading, setIsLoading] = useState(initialLoadingState);
  const [isTimedOut, setIsTimedOut] = useState(false);

  // Handle timeout for loading state
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        setIsTimedOut(true);
      }, timeoutDuration);
    } else {
      setIsTimedOut(false);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoading, timeoutDuration]);

  return {
    isLoading,
    isTimedOut,
    setIsLoading,
    reset: () => {
      setIsLoading(true);
      setIsTimedOut(false);
    }
  };
}
