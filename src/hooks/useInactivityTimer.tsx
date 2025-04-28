
import { useState, useEffect, useCallback } from 'react';

const INACTIVITY_TIMEOUT = 60000; // 60 seconds
const DIALOG_TIMEOUT = 10000; // 10 seconds

export const useInactivityTimer = (onReset: () => void) => {
  const [showDialog, setShowDialog] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [dialogTimeoutId, setDialogTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    // Only reset the timer if the dialog is not showing
    if (!showDialog) {
      setLastActivity(Date.now());
    }
  }, [showDialog]);

  const handleContinue = useCallback(() => {
    // Clear the auto-reset timeout when user clicks continue
    if (dialogTimeoutId) {
      clearTimeout(dialogTimeoutId);
      setDialogTimeoutId(null);
    }
    setLastActivity(Date.now());
    setShowDialog(false);
  }, [dialogTimeoutId]);

  const handleCancel = useCallback(() => {
    // Clear the auto-reset timeout when user clicks cancel
    if (dialogTimeoutId) {
      clearTimeout(dialogTimeoutId);
      setDialogTimeoutId(null);
    }
    setShowDialog(false);
    onReset();
  }, [dialogTimeoutId, onReset]);

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
        const timeoutId = setTimeout(() => {
          if (showDialog) { // If dialog is still shown after 10 seconds
            onReset();
            setShowDialog(false);
          }
        }, DIALOG_TIMEOUT);
        
        setDialogTimeoutId(timeoutId);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInactivity);
      if (dialogTimeoutId) {
        clearTimeout(dialogTimeoutId);
      }
    };
  }, [lastActivity, showDialog, onReset, resetTimer, dialogTimeoutId]);

  return {
    showDialog,
    handleContinue,
    handleCancel
  };
};
