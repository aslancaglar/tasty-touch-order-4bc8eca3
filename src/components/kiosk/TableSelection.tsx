
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface TableSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableNumber: string) => void;
}

const TableSelection = ({ isOpen, onClose, onSelect }: TableSelectionProps) => {
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
  
  useEffect(() => {
    // This component is now only shown through direct invocation, not through OrderTypeSelection
    // Force close if shown - this is a safety measure
    onClose();
  }, [isOpen, onClose]);

  const handleConfirm = () => {
    if (selectedTable) {
      onSelect(selectedTable);
    }
  };

  // Never render the component - this ensures it won't show up
  return null;
};

export default TableSelection;
