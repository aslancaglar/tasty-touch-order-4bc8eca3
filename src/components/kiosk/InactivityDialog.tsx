
import React from 'react';
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
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
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
