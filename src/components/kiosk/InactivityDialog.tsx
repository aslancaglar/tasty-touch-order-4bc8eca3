
import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SupportedLanguage } from "@/utils/language-utils";

interface InactivityDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
  t: (key: string) => string;
  uiLanguage?: SupportedLanguage;
}

const InactivityDialog: React.FC<InactivityDialogProps> = ({
  isOpen,
  onContinue,
  onCancel,
  t,
  uiLanguage = "fr"
}) => {
  // Add a timer reference to track when the component was mounted
  const timerRef = useRef<number | null>(null);
  
  // When dialog becomes visible, start a timer that will automatically dismiss it
  useEffect(() => {
    if (isOpen) {
      console.log("Inactivity Dialog opened, setting timeout for auto-cancel");
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // Set new timer for auto-cancellation (10 seconds)
      timerRef.current = window.setTimeout(() => {
        console.log("Dialog auto-timeout triggered, executing cancel");
        onCancel();
      }, 10000); // 10 seconds
    }
    
    // Cleanup function to clear the timer if component unmounts or dialog closes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, onCancel]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent 
        className="sm:max-w-[425px] z-[100]" 
        onPointerDownOutside={(e) => {
          // Prevent closing when clicking outside
          e.preventDefault();
        }} 
        onEscapeKeyDown={(e) => {
          // Prevent closing with Escape key
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("inactivityTitle")}</DialogTitle>
          <DialogDescription>
            {t("inactivityMessage")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            {t("no")}
          </Button>
          <Button
            type="button"
            onClick={onContinue}
          >
            {t("yes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InactivityDialog;
