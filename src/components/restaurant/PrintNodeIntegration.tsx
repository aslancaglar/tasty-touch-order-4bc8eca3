
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

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
  api_key?: string | null;
  configured_printers?: string[];
}

const PrintNodeIntegration = ({ restaurantId }: PrintNodeIntegrationProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [printers, setPrinters] = useState<Printer[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchApiConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') { // Not found error
            console.error("Error fetching print config:", error);
          }
          return;
        }
        
        if (data) {
          setApiKey(data.api_key || "");
          setIsConfigured(!!data.api_key);
          
          if (data.api_key) {
            fetchPrinters(data.api_key);
          }
        }
      } catch (error) {
        console.error("Error fetching print config:", error);
      }
    };
    
    fetchApiConfig();
  }, [restaurantId]);

  const saveApiKey = async () => {
    try {
      setIsFetching(true);
      
      const printerData = await fetchPrintersFromAPI(apiKey);
      
      if (printerData.length === 0) {
        toast({
          title: "API Key Invalid",
          description: "Unable to retrieve printers with this API key",
          variant: "destructive"
        });
        setIsFetching(false);
        return;
      }
      
      const printConfig: PrintConfig = {
        restaurant_id: restaurantId,
        api_key: apiKey,
        configured_printers: []
      };

      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert(printConfig, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        throw error;
      }
      
      setIsConfigured(true);
      setPrinters(printerData);
      
      toast({
        title: "API Key Saved",
        description: "PrintNode API key saved successfully",
      });
    } catch (error) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: "Error saving API key",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPrinters = async (key = apiKey) => {
    try {
      setIsFetching(true);
      
      const printerData = await fetchPrintersFromAPI(key);
      
      const { data: configData, error: configError } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers')
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }
      
      const selectedPrinterIds = (configData?.configured_printers || []) as string[];
      
      const printersWithSelection = printerData.map(printer => ({
        ...printer,
        selected: selectedPrinterIds.includes(printer.id)
      }));
      
      setPrinters(printersWithSelection);
      
      toast({
        title: "Printers Fetched",
        description: `${printerData.length} printers retrieved`,
      });
    } catch (error) {
      console.error("Error fetching printers:", error);
      toast({
        title: "Error",
        description: "Error fetching printers",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPrintersFromAPI = async (key: string): Promise<Printer[]> => {
    if (!key || key.length < 10) {
      return [];
    }
    
    try {
      // Make actual API call to PrintNode
      const response = await fetch('https://api.printnode.com/printers', {
        headers: {
          'Authorization': `Basic ${btoa(key + ':')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`PrintNode API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform PrintNode response to our Printer interface
      return data.map((printer: any) => ({
        id: printer.id.toString(),
        name: printer.name,
        description: printer.description || (printer.computer ? printer.computer.name : undefined),
        state: printer.state === "online" ? "online" : "offline",
        selected: false
      }));
    } catch (error) {
      console.error("Error calling PrintNode API:", error);
      
      // Fallback to mock data during development or when API fails
      if (process.env.NODE_ENV === 'development') {
        console.log("Using mock printer data in development");
        return [
          {
            id: "printer1",
            name: "Printer 1",
            description: "Front Counter",
            state: "online",
            selected: false
          },
          {
            id: "printer2",
            name: "Printer 2",
            description: "Kitchen",
            state: "online",
            selected: false
          },
          {
            id: "printer3",
            name: "Printer 3",
            description: "Bar",
            state: "offline",
            selected: false
          }
        ];
      }
      
      return [];
    }
  };

  const togglePrinterSelection = async (printerId: string) => {
    const updatedPrinters = printers.map(printer => {
      if (printer.id === printerId) {
        return { ...printer, selected: !printer.selected };
      }
      return printer;
    });
    
    setPrinters(updatedPrinters);
    
    try {
      const selectedPrinterIds = updatedPrinters
        .filter(p => p.selected)
        .map(p => p.id);
      
      const { error } = await supabase
        .from('restaurant_print_config')
        .update({
          configured_printers: selectedPrinterIds
        })
        .eq('restaurant_id', restaurantId);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Printers Updated",
        description: "Printer configuration updated",
      });
    } catch (error) {
      console.error("Error saving printer selection:", error);
      toast({
        title: "Error",
        description: "Error saving printer selection",
        variant: "destructive"
      });
    }
  };

  const testPrinter = async (printerId: string) => {
    setIsTesting({ ...isTesting, [printerId]: true });
    
    try {
      const printer = printers.find(p => p.id === printerId);
      
      if (!printer) {
        throw new Error("Printer not found");
      }
      
      if (printer.state === "offline") {
        throw new Error("Cannot print to offline printer");
      }
      
      // Create a test receipt
      const testReceipt = {
        title: "Test Receipt",
        content: [
          { type: "text", value: "Test Receipt", style: "header" },
          { type: "text", value: new Date().toLocaleString(), style: "normal" },
          { type: "text", value: "This is a test receipt from your restaurant's kiosk system", style: "normal" },
          { type: "text", value: "If you can read this, printing is working correctly!", style: "bold" }
        ]
      };
      
      // In a real implementation, make an API call to PrintNode
      const response = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(apiKey + ':')}`
        },
        body: JSON.stringify({
          printer: printerId,
          title: "Test Print",
          contentType: "raw_base64",
          content: btoa(JSON.stringify(testReceipt)),
          source: "Restaurant Kiosk"
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending print job: ${response.status}`);
      }
      
      toast({
        title: "Test Print Sent",
        description: `Test print sent to ${printer.name}`,
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      toast({
        title: "Error",
        description: "Error sending test print: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setIsTesting({ ...isTesting, [printerId]: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">PrintNode Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label htmlFor="api-key">PrintNode API Key</Label>
          <div className="flex gap-2">
            <Input 
              id="api-key" 
              type="password"
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your PrintNode API key"
              disabled={isFetching}
              className="flex-1"
            />
            <Button 
              onClick={saveApiKey}
              disabled={isFetching || !apiKey}
              className="bg-kiosk-primary"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Get an API key by creating an account on 
            <a href="https://www.printnode.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              PrintNode.com
            </a>
          </p>
        </div>
        
        {isConfigured && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium">Available Printers</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchPrinters()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {isFetching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : printers.length > 0 ? (
              <div className="space-y-3">
                {printers.map((printer) => (
                  <div key={printer.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`printer-${printer.id}`}
                        checked={printer.selected}
                        onCheckedChange={() => togglePrinterSelection(printer.id)}
                      />
                      <div>
                        <label 
                          htmlFor={`printer-${printer.id}`} 
                          className="font-medium cursor-pointer"
                        >
                          {printer.name}
                        </label>
                        {printer.description && (
                          <p className="text-sm text-muted-foreground">{printer.description}</p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`
                          ${printer.state === 'online' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200'}
                        `}
                      >
                        {printer.state === 'online' ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {printer.state === 'online' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testPrinter(printer.id)}
                      disabled={isTesting[printer.id] || printer.state === 'offline'}
                    >
                      {isTesting[printer.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      Test
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-md">
                <p className="text-muted-foreground">No printers found</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintNodeIntegration;
