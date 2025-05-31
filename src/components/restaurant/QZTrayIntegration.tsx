
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, RefreshCw, LockKeyhole } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface PrinterConfig {
  id: string;
  name: string;
  description?: string;
  state: "online" | "offline";
  selected: boolean;
}

interface QZTrayIntegrationProps {
  restaurantId: string;
}

const QZTrayIntegration = ({ restaurantId }: QZTrayIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    const fetchPrintConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();
        
        if (error) {
          if (error.code !== 'PGRST116') { // Not found error
            console.error("Error fetching print config");
          }
          return;
        }
        
        if (data && data.configured_printers) {
          // Parse configured_printers safely
          const configuredPrinters = Array.isArray(data.configured_printers) 
            ? data.configured_printers as string[]
            : [];
          
          if (configuredPrinters.length > 0) {
            setIsConnected(true);
            fetchPrinters();
          }
        }
      } catch (error) {
        console.error("Error fetching print configuration");
      }
    };
    
    fetchPrintConfig();
  }, [restaurantId]);

  const connectToQZTray = async () => {
    try {
      setIsFetching(true);
      
      // Mock QZ Tray connection for development
      if (process.env.NODE_ENV === 'development') {
        console.log("Mock QZ Tray connection in development");
        setIsConnected(true);
        
        // Mock printer data
        const mockPrinters: PrinterConfig[] = [
          {
            id: "thermal-printer-1",
            name: "Thermal Printer 1",
            description: "Front Counter",
            state: "online",
            selected: false
          },
          {
            id: "thermal-printer-2", 
            name: "Thermal Printer 2",
            description: "Kitchen",
            state: "online",
            selected: false
          }
        ];
        
        setPrinters(mockPrinters);
        
        toast({
          title: "QZ Tray Connected",
          description: "Successfully connected to QZ Tray service",
        });
        
        setIsFetching(false);
        return;
      }

      // Real QZ Tray implementation would go here
      toast({
        title: "QZ Tray Integration",
        description: "QZ Tray integration is available in production mode",
      });
      
    } catch (error) {
      console.error("Error connecting to QZ Tray");
      toast({
        title: "Connection Error",
        description: "Failed to connect to QZ Tray service",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      setIsFetching(true);
      
      // Get existing configuration
      const { data: configData, error: configError } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers')
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }
      
      // Parse configured printers safely
      const selectedPrinterIds = configData?.configured_printers 
        ? (Array.isArray(configData.configured_printers) 
           ? configData.configured_printers as string[]
           : [])
        : [];
      
      // Mock printer data with selection state
      const mockPrinters: PrinterConfig[] = [
        {
          id: "thermal-printer-1",
          name: "Thermal Printer 1", 
          description: "Front Counter",
          state: "online",
          selected: selectedPrinterIds.includes("thermal-printer-1")
        },
        {
          id: "thermal-printer-2",
          name: "Thermal Printer 2",
          description: "Kitchen", 
          state: "online",
          selected: selectedPrinterIds.includes("thermal-printer-2")
        }
      ];
      
      setPrinters(mockPrinters);
      
      toast({
        title: "Printers Fetched",
        description: `${mockPrinters.length} printers retrieved`,
      });
    } catch (error) {
      console.error("Error fetching printer data");
      toast({
        title: "Error",
        description: "Error fetching printers",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
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
      
      // Convert to proper JSON format for database
      const printersJson = selectedPrinterIds as unknown as any;
      
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          configured_printers: printersJson
        }, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Printers Updated",
        description: "Printer configuration updated",
      });
    } catch (error) {
      console.error("Error saving printer selection");
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
      
      // Mock test print
      console.log(`Test printing to ${printer.name}`);
      
      toast({
        title: "Test Print Sent",
        description: `Test print sent to ${printer.name}`,
      });
    } catch (error) {
      console.error("Error testing printer");
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
        <CardTitle className="text-lg">QZ Tray Integration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect to QZ Tray to enable direct thermal printer integration
            </p>
            <Button 
              onClick={connectToQZTray}
              disabled={isFetching}
              className="bg-kiosk-primary"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect to QZ Tray"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-medium">Available Printers</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchPrinters}
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

export default QZTrayIntegration;
