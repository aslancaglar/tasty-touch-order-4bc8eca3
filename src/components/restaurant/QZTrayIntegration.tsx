
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { 
  initializeQZTray, 
  getQZPrinters, 
  testQZPrinter, 
  isQZTrayAvailable,
  disconnectQZTray 
} from "@/utils/qz-tray-utils";

interface QZPrinter {
  name: string;
  connection: string;
  type: string;
  selected: boolean;
}

interface QZTrayIntegrationProps {
  restaurantId: string;
}

const QZTrayIntegration = ({ restaurantId }: QZTrayIntegrationProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [printers, setPrinters] = useState<QZPrinter[]>([]);
  const [qzTrayAvailable, setQzTrayAvailable] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    checkQZTrayAvailability();
    loadSavedPrinters();
  }, [restaurantId]);

  const checkQZTrayAvailability = () => {
    const available = isQZTrayAvailable();
    setQzTrayAvailable(available);
    
    if (!available) {
      console.log("QZ Tray not available - please install QZ Tray");
    }
  };

  const loadSavedPrinters = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('qz_tray_printers')
        .eq('restaurant_id', restaurantId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error loading saved printers:", error);
        return;
      }
      
      if (data?.qz_tray_printers) {
        const savedPrinterNames = data.qz_tray_printers as string[];
        // We'll fetch current printers and mark saved ones as selected
        if (isConnected) {
          await fetchPrinters(savedPrinterNames);
        }
      }
    } catch (error) {
      console.error("Error loading saved QZ Tray printers:", error);
    }
  };

  const connectToQZTray = async () => {
    if (!qzTrayAvailable) {
      toast({
        title: "QZ Tray Not Available",
        description: "Please install QZ Tray from qz.io and ensure it's running",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      const connected = await initializeQZTray();
      
      if (connected) {
        setIsConnected(true);
        await fetchPrinters();
        
        toast({
          title: "QZ Tray Connected",
          description: "Successfully connected to QZ Tray service",
        });
      } else {
        throw new Error("Failed to connect to QZ Tray");
      }
    } catch (error) {
      console.error("QZ Tray connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to QZ Tray. Ensure QZ Tray is running.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchPrinters = async (savedPrinterNames: string[] = []) => {
    try {
      setIsFetching(true);
      
      const qzPrinters = await getQZPrinters();
      
      const printersWithSelection = qzPrinters.map(printer => ({
        ...printer,
        selected: savedPrinterNames.includes(printer.name)
      }));
      
      setPrinters(printersWithSelection);
      
      toast({
        title: "Printers Loaded",
        description: `Found ${qzPrinters.length} QZ Tray printers`,
      });
    } catch (error) {
      console.error("Error fetching QZ Tray printers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch printers from QZ Tray",
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const togglePrinterSelection = async (printerName: string) => {
    const updatedPrinters = printers.map(printer => {
      if (printer.name === printerName) {
        return { ...printer, selected: !printer.selected };
      }
      return printer;
    });
    
    setPrinters(updatedPrinters);
    
    try {
      const selectedPrinterNames = updatedPrinters
        .filter(p => p.selected)
        .map(p => p.name);
      
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert({
          restaurant_id: restaurantId,
          qz_tray_printers: selectedPrinterNames
        }, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        throw error;
      }
      
      toast({
        title: "Printers Updated",
        description: "QZ Tray printer configuration saved",
      });
    } catch (error) {
      console.error("Error saving QZ Tray printer selection:", error);
      toast({
        title: "Error",
        description: "Failed to save printer selection",
        variant: "destructive"
      });
    }
  };

  const testPrinter = async (printerName: string) => {
    setIsTesting({ ...isTesting, [printerName]: true });
    
    try {
      const success = await testQZPrinter(printerName);
      
      if (success) {
        toast({
          title: "Test Print Sent",
          description: `Test receipt sent to ${printerName} via QZ Tray`,
        });
      } else {
        throw new Error("Test print failed");
      }
    } catch (error) {
      console.error("Error testing QZ Tray printer:", error);
      toast({
        title: "Test Failed",
        description: `Failed to print test receipt: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive"
      });
    } finally {
      setIsTesting({ ...isTesting, [printerName]: false });
    }
  };

  const disconnectFromQZTray = async () => {
    try {
      await disconnectQZTray();
      setIsConnected(false);
      setPrinters([]);
      
      toast({
        title: "Disconnected",
        description: "Disconnected from QZ Tray service",
      });
    } catch (error) {
      console.error("Error disconnecting from QZ Tray:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Printer className="h-5 w-5" />
          QZ Tray Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!qzTrayAvailable && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              QZ Tray is not available. Please download and install QZ Tray from{" "}
              <a 
                href="https://qz.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                qz.io/download
              </a>{" "}
              and ensure it's running.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Connection Status</Label>
              <p className="text-sm text-muted-foreground">
                Connect to QZ Tray for direct printer communication
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`
                  ${isConnected 
                    ? 'bg-green-100 text-green-800 border-green-200' 
                    : 'bg-red-100 text-red-800 border-red-200'}
                `}
              >
                {isConnected ? (
                  <Wifi className="h-3 w-3 mr-1" />
                ) : (
                  <WifiOff className="h-3 w-3 mr-1" />
                )}
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              
              {!isConnected ? (
                <Button 
                  onClick={connectToQZTray}
                  disabled={isConnecting || !qzTrayAvailable}
                  className="bg-kiosk-primary"
                >
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Connect
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={disconnectFromQZTray}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {isConnected && (
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
                  <div key={printer.name} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`qz-printer-${printer.name}`}
                        checked={printer.selected}
                        onCheckedChange={() => togglePrinterSelection(printer.name)}
                      />
                      <div>
                        <label 
                          htmlFor={`qz-printer-${printer.name}`} 
                          className="font-medium cursor-pointer"
                        >
                          {printer.name}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {printer.connection} • {printer.type}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Available
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testPrinter(printer.name)}
                      disabled={isTesting[printer.name]}
                    >
                      {isTesting[printer.name] ? (
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
                <p className="text-muted-foreground">No printers found via QZ Tray</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">About QZ Tray</h4>
          <p className="text-sm text-blue-800">
            QZ Tray provides direct communication with thermal printers and other hardware. 
            It's more reliable than browser printing and works offline. Download from{" "}
            <a 
              href="https://qz.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              qz.io/download
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QZTrayIntegration;
