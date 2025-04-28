
import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InactivityDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  onCancel: () => void;
  t: (key: string) => string;
}

const InactivityDialog: React.FC<InactivityDialogProps> = ({
  isOpen,
  onContinue,
  onCancel,
  t
}) => {
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent 
        className="sm:max-w-[425px]" 
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
