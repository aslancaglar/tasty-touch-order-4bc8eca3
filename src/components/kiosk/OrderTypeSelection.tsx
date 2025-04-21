
import { useState } from "react";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderType: (type: OrderType, tableNumber?: string) => void;
}

const OrderTypeSelection = ({ isOpen, onClose, onSelectOrderType }: OrderTypeSelectionProps) => {
  const handleSelectDineIn = () => {
    // Directly select dine-in without showing table selection
    onSelectOrderType("dine-in");
  };

  const handleSelectTakeaway = () => {
    onSelectOrderType("takeaway");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-bold mb-6">
            Comment souhaitez-vous commander ?
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
          <Button 
            onClick={handleSelectDineIn} 
            variant="outline" 
            className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10"
          >
            <UtensilsCrossed className="h-24 w-24 mb-4" />
            <span className="text-2xl font-semibold">Sur Place</span>
          </Button>
          <Button 
            onClick={handleSelectTakeaway} 
            variant="outline" 
            className="flex flex-col items-center justify-center h-64 p-6 hover:bg-primary/10"
          >
            <ShoppingBag className="h-24 w-24 mb-4" />
            <span className="text-2xl font-semibold">À Emporter</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderTypeSelection;
