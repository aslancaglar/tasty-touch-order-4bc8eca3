
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/database-types";

interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable: (tableNumber: string) => void;
  restaurant: Restaurant | null;
}

const TableSelection = ({ isOpen, onClose, onSelectTable, restaurant }: TableSelectionProps) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tables, setTables] = useState([
    { id: "1", name: "Table 1" },
    { id: "2", name: "Table 2" },
    { id: "3", name: "Table 3" },
    { id: "4", name: "Table 4" },
    { id: "5", name: "Table 5" },
    { id: "6", name: "Table 6" },
    { id: "7", name: "Table 7" },
    { id: "8", name: "Table 8" },
  ]);

  const handleConfirm = () => {
    if (selectedTable) {
      onSelectTable(selectedTable);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choisissez votre table</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedTable || ""} onValueChange={setSelectedTable}>
            <div className="grid grid-cols-2 gap-4">
              {tables.map((table) => (
                <div key={table.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={table.id} id={`table-${table.id}`} />
                  <Label htmlFor={`table-${table.id}`}>{table.name}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" onClick={handleConfirm} disabled={!selectedTable}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableSelection;
