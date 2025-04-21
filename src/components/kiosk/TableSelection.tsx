
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getRestaurantTables, getRestaurantPrintConfig } from "@/services/kiosk-service";

/**
 * Props for TableSelection modal.
 */
interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableNumber: string) => void;
  restaurantId?: string;
}

const TableSelection = ({ isOpen, onClose, onSelect, restaurantId }: TableSelectionProps) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState<{ id: string; table_number: string }[]>([]);
  const [tableSelectionEnabled, setTableSelectionEnabled] = useState(true);

  // Fetch tables for the restaurant
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

  // Fetch table selection setting
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
    if (isOpen && restaurantId) {
      fetchTableSelectionSetting();
    }
  }, [isOpen, restaurantId]);

  // If table selection becomes disabled while modal is open, close modal
  useEffect(() => {
    if (isOpen && !tableSelectionEnabled) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSelectionEnabled, isOpen]);

  const handleConfirm = () => {
    if (selectedTable) {
      onSelect(selectedTable);
    }
  };

  // Don't render if table selection feature is disabled
  if (!tableSelectionEnabled) return null;

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
