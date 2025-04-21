
import { useState, useEffect } from "react";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TableSelection from "./TableSelection";
import { supabase } from "@/integrations/supabase/client";

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
  const [requireTableSelection, setRequireTableSelection] = useState(true);

  useEffect(() => {
    const fetchRequireTableSelection = async () => {
      if (!restaurantId) return;
      
      try {
        const { data, error } = await supabase
          .from("restaurant_print_config")
          .select("require_table_selection")
          .eq("restaurant_id", restaurantId)
          .maybeSingle();

        // Only set to false if we explicitly get data with require_table_selection set to false
        if (!error && data) {
          setRequireTableSelection(data.require_table_selection !== false);
        }
        
        console.log("Table selection requirement:", data?.require_table_selection, "Setting to:", data?.require_table_selection !== false);
      } catch (error) {
        console.error("Error fetching table selection setting:", error);
      }
    };
    
    fetchRequireTableSelection();
  }, [restaurantId]);

  const handleSelectDineIn = () => {
    setOrderType("dine-in");
    
    // If table selection is not required, directly select dine-in without table
    if (!requireTableSelection) {
      console.log("Table selection not required, bypassing table selection");
      onSelectOrderType("dine-in", undefined);
    } else {
      console.log("Table selection required, showing table selection modal");
      setShowTableSelection(true);
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
      <Dialog open={isOpen && !showTableSelection} onOpenChange={(open) => !open && onClose()}>
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
      />
    </>
  );
};

export default OrderTypeSelection;
