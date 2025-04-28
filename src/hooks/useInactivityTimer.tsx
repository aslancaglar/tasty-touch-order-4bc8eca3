
import { useState, useEffect, useCallback, useRef } from 'react';

const INACTIVITY_TIMEOUT = 60000; // 60 seconds
const DIALOG_TIMEOUT = 10000; // 10 seconds

export const useInactivityTimer = (onReset: () => void) => {
  const [showDialog, setShowDialog] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const dialogTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    // Only reset the timer if the dialog is not showing
    if (!showDialog) {
      setLastActivity(Date.now());
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
  }, []);

  const handleCancel = useCallback(() => {
    // Clear the auto-reset timeout when user clicks cancel
    if (dialogTimeoutIdRef.current) {
      clearTimeout(dialogTimeoutIdRef.current);
      dialogTimeoutIdRef.current = null;
    }
    setShowDialog(false);
    onReset();
  }, [onReset]);

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
          onReset();
          setShowDialog(false);
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

  // Side effect to ensure dialog auto-closes after appearing
  useEffect(() => {
    if (showDialog) {
      console.log("Dialog shown, setting auto-close timer");
      // Make sure we don't have multiple timers
      if (dialogTimeoutIdRef.current) {
        clearTimeout(dialogTimeoutIdRef.current);
      }
      
      dialogTimeoutIdRef.current = setTimeout(() => {
        console.log("Auto-closing dialog after timeout");
        onReset();
        setShowDialog(false);
      }, DIALOG_TIMEOUT);
      
      return () => {
        if (dialogTimeoutIdRef.current) {
          clearTimeout(dialogTimeoutIdRef.current);
        }
      };
    }
  }, [showDialog, onReset]);

  return {
    showDialog,
    handleContinue,
    handleCancel
  };
};
