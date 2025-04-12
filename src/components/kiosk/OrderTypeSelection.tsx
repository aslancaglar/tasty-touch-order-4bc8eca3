
import { useState } from "react";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TableSelection from "./TableSelection";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderType: (type: OrderType, tableNumber?: string) => void;
}

const OrderTypeSelection = ({ isOpen, onClose, onSelectOrderType }: OrderTypeSelectionProps) => {
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [showTableSelection, setShowTableSelection] = useState(false);

  const handleSelectDineIn = () => {
    setOrderType("dine-in");
    setShowTableSelection(true);
  };

  const handleSelectTakeaway = () => {
    onSelectOrderType("takeaway");
  };

  const handleTableSelected = (tableNumber: string) => {
    setShowTableSelection(false);
    onSelectOrderType("dine-in", tableNumber);
  };

  return (
    <>
      <Dialog open={isOpen && !showTableSelection} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">How would you like to order?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              onClick={handleSelectDineIn} 
              variant="outline" 
              className="flex flex-col items-center justify-center h-36 p-4 hover:bg-primary/10"
            >
              <UtensilsCrossed className="h-12 w-12 mb-2" />
              <span className="text-lg font-medium">Dine In</span>
            </Button>
            <Button 
              onClick={handleSelectTakeaway} 
              variant="outline" 
              className="flex flex-col items-center justify-center h-36 p-4 hover:bg-primary/10"
            >
              <ShoppingBag className="h-12 w-12 mb-2" />
              <span className="text-lg font-medium">Takeaway</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TableSelection 
        isOpen={showTableSelection} 
        onClose={() => setShowTableSelection(false)}
        onSelect={handleTableSelected}
      />
    </>
  );
};

export default OrderTypeSelection;
