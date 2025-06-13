
import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 60000; // 60 seconds
const DIALOG_TIMEOUT = 10000; // 10 seconds

export const useInactivityTimer = (onReset?: () => void) => {
  const [showInactivityDialog, setShowInactivityDialog] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const dialogTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const inactiveRef = useRef<boolean>(false);

  const resetTimer = useCallback(() => {
    // Only reset the timer if the dialog is not showing
    if (!showInactivityDialog) {
      setLastActivity(Date.now());
      inactiveRef.current = false;
    }
  }, [showInactivityDialog]);

  const handleContinue = useCallback(() => {
    // Clear the auto-reset timeout when user clicks continue
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setLastActivity(Date.now());
    setShowInactivityDialog(false);
    inactiveRef.current = false;
  }, []);

  const handleCancel = useCallback(() => {
    // Clear the auto-reset timeout when user clicks cancel
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setShowInactivityDialog(false);
    inactiveRef.current = false;
    if (onReset) {
      onReset();
    }
  }, [onReset]);

  // Called when we want to perform a complete reset of the timer
  const fullReset = useCallback(() => {
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setShowInactivityDialog(false);
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
      if (!showInactivityDialog) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (!showInactivityDialog && timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log("Inactivity detected, showing dialog");
        setShowInactivityDialog(true);
        
        // Set timer to auto-reset after dialog timeout
        if (dialogTimeoutIdRef.current) {
          clearTimeout(dialogTimeoutIdRef.current);
        }
        
        dialogTimeoutIdRef.current = setTimeout(() => {
          console.log("Auto-closing dialog after timeout - redirecting to welcome page");
          setShowInactivityDialog(false);
          inactiveRef.current = true;
          if (onReset) {
            onReset(); // Reset to welcome page after timeout
          }
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
  }, [lastActivity, showInactivityDialog, onReset, resetTimer]);

  return {
    showInactivityDialog,
    resetTimer,
    handleContinue,
    handleCancel: handleCancel,
    fullReset
  };
};
