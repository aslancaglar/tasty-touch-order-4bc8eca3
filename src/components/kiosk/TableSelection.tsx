
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getRestaurantTables } from "@/services/kiosk-service";

interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableNumber: string) => void;
  restaurantId?: string;
}

const TableSelection = ({ isOpen, onClose, onSelect, restaurantId }: TableSelectionProps) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<{ id: string; table_number: string }[]>([]);

  useEffect(() => {
    const fetchTables = async () => {
      if (!restaurantId) return;
      try {
        const tablesData = await getRestaurantTables(restaurantId);
        setTables(tablesData);
      } catch {
        setTables([]);
      }
    };
    if (isOpen && restaurantId) fetchTables();
  }, [isOpen, restaurantId]);

  const handleConfirm = () => {
    if (selectedTable) {
      onSelect(selectedTable);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Sélectionnez votre table</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedTable || ""} onValueChange={setSelectedTable} className="grid grid-cols-2 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="flex items-center space-x-2">
                <RadioGroupItem value={table.table_number} id={`table-${table.id}`} />
                <Label htmlFor={`table-${table.id}`} className="text-lg cursor-pointer">
                  {table.table_number}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedTable}
            className="w-full bg-kiosk-primary"
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableSelection;
