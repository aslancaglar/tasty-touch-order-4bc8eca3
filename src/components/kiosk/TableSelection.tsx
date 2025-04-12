
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableNumber: string) => void;
}

const TableSelection = ({ isOpen, onClose, onSelect }: TableSelectionProps) => {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  const tables = [
    { id: "1", name: "Table 1" },
    { id: "2", name: "Table 2" },
    { id: "3", name: "Table 3" },
    { id: "4", name: "Table 4" },
    { id: "5", name: "Table 5" },
    { id: "6", name: "Table 6" },
    { id: "7", name: "Table 7" },
    { id: "8", name: "Table 8" },
  ];

  const handleConfirm = () => {
    if (selectedTable) {
      onSelect(selectedTable);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Select Your Table</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedTable || ""} onValueChange={setSelectedTable} className="grid grid-cols-2 gap-4">
            {tables.map((table) => (
              <div key={table.id} className="flex items-center space-x-2">
                <RadioGroupItem value={table.id} id={`table-${table.id}`} />
                <Label htmlFor={`table-${table.id}`} className="text-lg cursor-pointer">
                  {table.name}
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
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableSelection;
