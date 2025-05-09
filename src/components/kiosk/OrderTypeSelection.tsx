
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderType?: (type: OrderType, tableNumber?: string) => void;
  onOrderTypeSelected?: (type: OrderType, table?: string) => void; // Added to match the prop in KioskView
  uiLanguage?: SupportedLanguage;
}

const OrderTypeSelection = ({
  isOpen,
  onClose,
  onOrderTypeSelected,
  onSelectOrderType,
  uiLanguage = "fr"
}: OrderTypeSelectionProps) => {
  const { t } = useTranslation(uiLanguage);
  
  const handleSelectDineIn = () => {
    // Use either callback function that's provided
    if (onOrderTypeSelected) {
      onOrderTypeSelected("dine-in");
    } else if (onSelectOrderType) {
      onSelectOrderType("dine-in");
    }
  };
  
  const handleSelectTakeaway = () => {
    // Use either callback function that's provided
    if (onOrderTypeSelected) {
      onOrderTypeSelected("takeaway");
    } else if (onSelectOrderType) {
      onSelectOrderType("takeaway");
    }
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={open => !open && onClose()}
      // Don't block background pointer events 
      modal={false}
    >
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-center font-bold mb-6 text-5xl">
            {t("orderType.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          <Button 
            onClick={handleSelectDineIn} 
            variant="outline" 
            className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10"
          >
            <UtensilsCrossed className="h-24 w-24 mb-4" />
            <span className="font-semibold text-4xl">{t("orderType.dineIn")}</span>
          </Button>
          <Button 
            onClick={handleSelectTakeaway} 
            variant="outline" 
            className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10"
          >
            <ShoppingBag className="h-24 w-24 mb-4" />
            <span className="font-semibold text-4xl">{t("orderType.takeaway")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTypeSelection;
