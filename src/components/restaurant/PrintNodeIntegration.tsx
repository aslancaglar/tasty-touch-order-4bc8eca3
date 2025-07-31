import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, TestTube, Settings, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Updated interfaces
interface Printer {
  id: string;
  name: string;
  description?: string;
  state: "online" | "offline";
  selected: boolean;
}

interface PrintNodeIntegrationProps {
  restaurantId: string;
}

interface PrintConfig {
  id?: string;
  restaurant_id: string;
  configured_printers: string[];
}

const PrintNodeIntegration = ({ restaurantId }: PrintNodeIntegrationProps) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load configured printers on mount
  useEffect(() => {
    loadConfiguredPrinters();
  }, [restaurantId]);

  const loadConfiguredPrinters = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers')
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data?.configured_printers) {
        setIsConfigured(true);
        // Auto-fetch printers if configuration exists
        fetchPrinters();
      }
    } catch (error) {
      console.error("Error loading print configuration:", error);
    }
  };

  const fetchPrinters = async () => {
    try {
      setIsFetching(true);
      
      // Call the secure edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/printnode-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'fetch-printers',
          restaurantId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch printers');
      }

      const { printers: printerData } = await response.json();
      
      // Get configured printers from database
      const { data: configData, error: configError } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers')
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }
      
      const selectedPrinterIds = (configData?.configured_printers || []) as string[];
      
      const printersWithSelection = printerData.map((printer: Printer) => ({
        ...printer,
        selected: selectedPrinterIds.includes(printer.id)
      }));
      
      setPrinters(printersWithSelection);
      setIsConfigured(true);
      
      toast({
        title: "Printers Fetched",
        description: `${printerData.length} printers retrieved`,
      });
    } catch (error) {
      console.error("Error fetching printer data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: `Failed to fetch printers: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const togglePrinterSelection = async (printerId: string) => {
    try {
      const updatedPrinters = printers.map(printer =>
        printer.id === printerId 
          ? { ...printer, selected: !printer.selected }
          : printer
      );
      
      setPrinters(updatedPrinters);
      
      const selectedPrinterIds = updatedPrinters
        .filter(printer => printer.selected)
        .map(printer => printer.id);
      
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          configured_printers: selectedPrinterIds
        });

      if (error) throw error;
      
      toast({
        title: "Configuration Updated",
        description: "Printer selection saved",
      });
    } catch (error) {
      console.error("Error updating printer selection:", error);
      toast({
        title: "Error",
        description: "Failed to update printer selection",
        variant: "destructive"
      });
    }
  };

  const testPrinter = async (printerId: string) => {
    try {
      setIsTesting(printerId);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/printnode-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action: 'test-printer',
          restaurantId,
          printerId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test printer');
      }

      toast({
        title: "Test Print Sent",
        description: "Check your printer for the test receipt",
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      toast({
        title: "Error",
        description: "Failed to send test print",
        variant: "destructive"
      });
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            PrintNode Integration
          </CardTitle>
          <CardDescription>
            Configure your thermal printers using PrintNode API (securely managed)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConfigured ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                PrintNode API key is configured securely. Click below to fetch your printers.
              </p>
              <Button onClick={fetchPrinters} disabled={isFetching}>
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Fetch Printers
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Available Printers</h3>
                <Button 
                  variant="outline" 
                  onClick={fetchPrinters} 
                  disabled={isFetching}
                  size="sm"
                >
                  {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
              </div>
              
              {printers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No printers found. Make sure your PrintNode client is running.
                </p>
              ) : (
                <div className="grid gap-4">
                  {printers.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Printer className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{printer.name}</div>
                          {printer.description && (
                            <div className="text-sm text-muted-foreground">
                              {printer.description}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={printer.state === "online" ? "default" : "secondary"}
                        >
                          {printer.state}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant={printer.selected ? "default" : "outline"}
                          size="sm"
                          onClick={() => togglePrinterSelection(printer.id)}
                        >
                          {printer.selected ? "Selected" : "Select"}
                        </Button>
                        
                        {printer.selected && printer.state === "online" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testPrinter(printer.id)}
                            disabled={isTesting === printer.id}
                          >
                            {isTesting === printer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrintNodeIntegration;