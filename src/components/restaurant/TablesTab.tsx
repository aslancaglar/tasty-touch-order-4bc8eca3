
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRestaurantPrintConfig, updateRestaurantPrintConfig, getRestaurantTables, addRestaurantTable, deleteRestaurantTable } from "@/services/kiosk-service";

interface TablesTabProps {
  restaurantId: string;
}

const TablesTab = ({ restaurantId }: TablesTabProps) => {
  const [tables, setTables] = useState<{ id: string; table_number: string }[]>([]);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [tableSelectionEnabled, setTableSelectionEnabled] = useState(true);
  const [savingTableSetting, setSavingTableSetting] = useState(false);

  const { toast } = useToast();

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      setLoading(true);
      try {
        const result = await getRestaurantTables(restaurantId);
        setTables(result);
      } catch (error: any) {
        toast({
          title: "Erreur",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, [restaurantId, toast]);

  // Fetch table selection settings
  useEffect(() => {
    const fetchTableSetting = async () => {
      try {
        const config = await getRestaurantPrintConfig(restaurantId);
        setTableSelectionEnabled(config?.require_table_selection !== false);
      } catch (e) {
        setTableSelectionEnabled(true);
      }
    };
    fetchTableSetting();
  }, [restaurantId]);

  // Add a table
  const handleAddTable = async () => {
    if (!newTableNumber.trim()) return;
    setLoading(true);
    try {
      const table = await addRestaurantTable(restaurantId, newTableNumber.trim());
      setTables([...tables, table]);
      setNewTableNumber("");
      toast({ title: "Table ajoutée" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete a table
  const handleDeleteTable = async (id: string) => {
    setLoading(true);
    try {
      await deleteRestaurantTable(id);
      setTables(tables.filter(t => t.id !== id));
      toast({ title: "Table supprimée" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save table selection enabled/disabled
  const handleSaveTableSetting = async () => {
    setSavingTableSetting(true);
    try {
      await updateRestaurantPrintConfig(restaurantId, { require_table_selection: tableSelectionEnabled });
      toast({ title: "Paramètre mis à jour" });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingTableSetting(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Paramètres des Tables</h3>
      <div className="flex items-center mb-4">
        <span className="mr-4">Forcer la sélection de table pour Sur Place&nbsp;?</span>
        <Switch checked={tableSelectionEnabled} onCheckedChange={setTableSelectionEnabled} />
        <Button 
          size="sm" 
          className="ml-4 bg-kiosk-primary" 
          onClick={handleSaveTableSetting}
          disabled={savingTableSetting}
        >
          {savingTableSetting ? "Sauvegarde..." : "Enregistrer"}
        </Button>
      </div>

      <h4 className="font-medium mb-2 mt-6">Tables configurées</h4>
      <div className="flex items-center mb-2">
        <Input 
          placeholder="Numéro de table (ex: 1, 2, 10...)" 
          value={newTableNumber}
          onChange={e => setNewTableNumber(e.target.value)}
          className="w-40 mr-2"
        />
        <Button onClick={handleAddTable} disabled={!newTableNumber.trim() || loading} className="bg-kiosk-primary">
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>
      <ul className="mb-2">
        {tables.map(table => (
          <li key={table.id} className="flex items-center border p-2 rounded mb-2">
            <span className="mr-2 font-semibold">{table.table_number}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDeleteTable(table.id)}
              disabled={loading}
            >
              <Trash className="w-4 h-4 text-red-500" />
            </Button>
          </li>
        ))}
        {tables.length === 0 && (
          <li className="text-muted-foreground">Aucune table configurée.</li>
        )}
      </ul>
    </div>
  );
};

export default TablesTab;
