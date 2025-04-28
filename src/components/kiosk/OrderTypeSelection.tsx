
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderType: (type: OrderType, tableNumber?: string) => void;
  onOrderTypeSelected?: (type: OrderType, table?: string) => void; // Added this prop to match usage in KioskView
  uiLanguage?: "fr" | "en" | "tr";
  t?: (key: string) => string; // Added t prop
}

const translations = {
  fr: {
    title: "Comment souhaitez-vous commander ?",
    dineIn: "Sur Place",
    takeaway: "À Emporter"
  },
  en: {
    title: "How would you like to order?",
    dineIn: "Dine-In",
    takeaway: "Takeaway"
  },
  tr: {
    title: "Nasıl sipariş vermek istersiniz?",
    dineIn: "Yerinde Yeme",
    takeaway: "Paket Servis"
  }
};

const OrderTypeSelection = ({
  isOpen,
  onClose,
  onSelectOrderType,
  onOrderTypeSelected, // Added this prop
  uiLanguage = "fr",
  t: externalT // Accept external t function
}: OrderTypeSelectionProps) => {
  const internalT = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];
  // Use provided t function or fall back to internal translations
  const t = externalT || internalT;
  
  const handleSelectDineIn = () => {
    if (onOrderTypeSelected) {
      onOrderTypeSelected("dine-in");
    } else {
      onSelectOrderType("dine-in");
    }
  };
  
  const handleSelectTakeaway = () => {
    if (onOrderTypeSelected) {
      onOrderTypeSelected("takeaway");
    } else {
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
          <DialogTitle className="text-center text-3xl font-bold mb-6">
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          <Button onClick={handleSelectDineIn} variant="outline" className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10">
            <UtensilsCrossed className="h-24 w-24 mb-4" />
            <span className="font-semibold text-4xl">{t("dineIn")}</span>
          </Button>
          <Button onClick={handleSelectTakeaway} variant="outline" className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10">
            <ShoppingBag className="h-24 w-24 mb-4" />
            <span className="font-semibold text-4xl">{t("takeaway")}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTypeSelection;
