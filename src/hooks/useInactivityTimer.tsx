
import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 60000; // 60 seconds
const DIALOG_TIMEOUT = 10000; // 10 seconds

export const useInactivityTimer = (onReset: () => void) => {
  const [showDialog, setShowDialog] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const dialogTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const inactiveRef = useRef<boolean>(false);

  const resetTimer = useCallback(() => {
    // Only reset the timer if the dialog is not showing
    if (!showDialog) {
      setLastActivity(Date.now());
      inactiveRef.current = false;
    }
  }, [showDialog]);

  const handleContinue = useCallback(() => {
    // Clear the auto-reset timeout when user clicks continue
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setLastActivity(Date.now());
    setShowDialog(false);
    inactiveRef.current = false;
  }, []);

  const handleCancel = useCallback(() => {
    // Clear the auto-reset timeout when user clicks cancel
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setShowDialog(false);
    inactiveRef.current = false;
    onReset();
  }, [onReset]);

  // Called when we want to perform a complete reset of the timer
  const fullReset = useCallback(() => {
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setShowDialog(false);
    setLastActivity(Date.now());
    inactiveRef.current = false;
  }, []);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart'
    ];

    const handleActivity = () => {
      // Only register activity if dialog is not showing
      if (!showDialog) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (!showDialog && timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        setShowDialog(true);
        
        // Set timer to auto-reset after dialog timeout
        dialogTimeoutIdRef.current = setTimeout(() => {
          console.log("Auto-closing dialog after timeout");
          setShowDialog(false); // Close dialog first
          setTimeout(() => {
            inactiveRef.current = true;
            onReset(); // Then reset to welcome page after a short delay - this is the "No" action
          }, 100);
        }, DIALOG_TIMEOUT);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInactivity);
      if (dialogTimeoutIdRef.current) {
        clearTimeout(dialogTimeoutIdRef.current);
      }
    };
  }, [lastActivity, showDialog, onReset, resetTimer]);

  return {
    showDialog,
    handleContinue,
    handleCancel,
    fullReset
  };
};
