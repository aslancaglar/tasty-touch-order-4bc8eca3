
import { useState, useEffect, useCallback } from 'react';
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const INACTIVITY_TIMEOUT = 60000; // 60 seconds
const DIALOG_TIMEOUT = 10000; // 10 seconds

export const useInactivityTimer = (onReset: () => void) => {
  const [showDialog, setShowDialog] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowDialog(false);
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
      resetTimer();
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
        setTimeout(() => {
          if (showDialog) { // If dialog is still shown after 10 seconds
            onReset();
          }
        }, DIALOG_TIMEOUT);
      }
    }, 1000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(checkInactivity);
    };
  }, [lastActivity, showDialog, onReset, resetTimer]);

  return {
    showDialog,
    setShowDialog,
    resetTimer
  };
};
