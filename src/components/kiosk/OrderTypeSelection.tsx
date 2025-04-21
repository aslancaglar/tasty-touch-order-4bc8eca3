
import { useState, useEffect } from "react";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TableSelection from "./TableSelection";
import { getRestaurantPrintConfig } from "@/services/kiosk-service";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderType: (type: OrderType, tableNumber?: string) => void;
  restaurantId?: string;
}

const OrderTypeSelection = ({ isOpen, onClose, onSelectOrderType, restaurantId }: OrderTypeSelectionProps) => {
  const [orderType, setOrderType] = useState<OrderType>(null);
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [tableSelectionEnabled, setTableSelectionEnabled] = useState(true);

  useEffect(() => {
    const fetchTableSelectionSetting = async () => {
      if (!restaurantId) {
        setTableSelectionEnabled(true);
        return;
      }
      try {
        const config = await getRestaurantPrintConfig(restaurantId);
        setTableSelectionEnabled(config?.require_table_selection !== false);
      } catch {
        setTableSelectionEnabled(true);
      }
    };
    if (isOpen) fetchTableSelectionSetting();
  }, [restaurantId, isOpen]);

  const handleSelectDineIn = () => {
    setOrderType("dine-in");
    if (tableSelectionEnabled) {
      setShowTableSelection(true);
    } else {
      onSelectOrderType("dine-in", undefined);
    }
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
      <Dialog open={isOpen && (!showTableSelection)} onOpenChange={(open) => !open && onClose()}>
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

      <TableSelection 
        isOpen={showTableSelection} 
        onClose={() => setShowTableSelection(false)}
        onSelect={handleTableSelected}
        restaurantId={restaurantId}
      />
    </>
  );
};

export default OrderTypeSelection;
