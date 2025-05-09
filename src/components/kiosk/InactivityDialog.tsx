
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
import { SupportedLanguage, useTranslation } from "@/utils/language-utils";

interface InactivityDialogProps {
  isOpen: boolean;
  onContinue?: () => void;
  onConfirm?: () => void; // Added to match KioskView usage
  onCancel: () => void;
  t?: (key: string) => string;
  uiLanguage?: SupportedLanguage;
}

const InactivityDialog: React.FC<InactivityDialogProps> = ({
  isOpen,
  onContinue,
  onConfirm, // Added to support both prop names
  onCancel,
  t: propT,
  uiLanguage = "fr"
}) => {
  // Use either the prop t function or the one from useTranslation
  const { t: translationT } = useTranslation(uiLanguage);
  const t = propT || translationT;
  
  // Use either onContinue or onConfirm callback
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else if (onConfirm) {
      onConfirm();
    }
  };

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
        className="sm:max-w-[500px] z-[100] w-[calc(100%-2rem)] rounded-lg" 
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
          <DialogTitle className="text-xl sm:text-2xl">{t("inactivityTitle")}</DialogTitle>
          <DialogDescription className="text-base sm:text-lg mt-2">
            {t("inactivityMessage")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="sm:text-lg py-6 px-8 sm:py-7 sm:px-10 w-full sm:w-auto"
          >
            {t("no")}
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            className="sm:text-lg py-6 px-8 sm:py-7 sm:px-10 w-full sm:w-auto mt-4 sm:mt-0"
          >
            {t("yes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InactivityDialog;
