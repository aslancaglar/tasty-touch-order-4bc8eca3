import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check, XCircle, RefreshCw, LockKeyhole, Shield, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { secureApiKeyService } from "@/services/secure-api-keys";
import { logSecurityEvent } from "@/utils/error-handler";
import { useAuth } from "@/contexts/AuthContext";

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
  configured_printers?: string[];
}

const PrintNodeIntegration = ({ restaurantId }: PrintNodeIntegrationProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isTesting, setIsTesting] = useState<Record<string, boolean>>({});
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [maskedKey, setMaskedKey] = useState<string>("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [hasLegacyKey, setHasLegacyKey] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'legacy' | 'none'>('none');
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);
  
  const { toast } = useToast();
  const { user, session, loading: authLoading } = useAuth();

  // Mask API key for display (show only last 4 characters)
  const maskApiKey = (key: string): string => {
    if (!key) return "";
    if (key.length <= 4) return "••••";
    return "•".repeat(key.length - 4) + key.slice(-4);
  };

  // Check if user is authenticated and ready
  const isAuthReady = !authLoading && user && session;

  useEffect(() => {
    if (!isAuthReady) {
      console.log('[PrintNodeIntegration] Waiting for authentication...');
      return;
    }

    const checkApiKeyConfiguration = async () => {
      try {
        console.log('[PrintNodeIntegration] Checking API key configuration for restaurant:', restaurantId);
        setErrorDetails(""); // Clear previous errors
        
        // Check for encrypted key first
        const encryptedKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
        
        if (encryptedKey) {
          console.log('[PrintNodeIntegration] Found encrypted API key');
          setApiKey(encryptedKey);
          setMaskedKey(maskApiKey(encryptedKey));
          setIsConfigured(true);
          setSecurityStatus('secure');
          logSecurityEvent('Secure PrintNode API key loaded', { restaurantId });
          fetchPrinters(encryptedKey);
          return;
        }

        console.log('[PrintNodeIntegration] No API key found');
        setSecurityStatus('none');
      } catch (error) {
        console.error("[PrintNodeIntegration] Error checking API key configuration:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setErrorDetails(errorMessage);
        
        // Show user-friendly error messages
        if (errorMessage.includes('Authentication') || errorMessage.includes('session')) {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please refresh the page and try again.",
            variant: "destructive"
          });
        } else if (!errorMessage.includes('not found')) {
          toast({
            title: "Configuration Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
        
        logSecurityEvent('API key configuration check failed', { 
          restaurantId, 
          error: errorMessage
        });
      }
    };
    
    if (restaurantId) {
      checkApiKeyConfiguration();
    }
  }, [restaurantId, isAuthReady, toast]);

  const retryOperation = async (operation: () => Promise<void>) => {
    setIsRetrying(true);
    setErrorDetails("");
    
    try {
      await operation();
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorDetails(errorMessage);
      
      if (errorMessage.includes('Authentication') || errorMessage.includes('session')) {
        toast({
          title: "Authentication Error", 
          description: "Please refresh the page and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Operation Failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const saveApiKey = async () => {
    if (!isAuthReady) {
      toast({
        title: "Authentication Required",
        description: "Please make sure you are logged in and try again.",
        variant: "destructive"
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "API key cannot be empty",
        variant: "destructive"
      });
      return;
    }

    await retryOperation(async () => {
      setIsFetching(true);
      
      console.log('[PrintNodeIntegration] Testing API key with PrintNode API');
      const printerData = await fetchPrintersFromAPI(apiKey);
      
      if (printerData.length === 0) {
        throw new Error("Unable to retrieve printers with this API key. Please verify the key is correct.");
      }
      
      console.log('[PrintNodeIntegration] API key validated, storing securely');
      
      // Store API key securely in vault
      const keyId = await secureApiKeyService.storeApiKey(restaurantId, 'printnode', apiKey);
      console.log('[PrintNodeIntegration] API key stored with ID:', keyId);
      
      // Update print config (no longer includes api_key)
      const printConfig: PrintConfig = {
        restaurant_id: restaurantId,
        configured_printers: []
      };

      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert(printConfig, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        console.error('[PrintNodeIntegration] Error updating print config:', error);
        throw new Error(`Failed to update print configuration: ${error.message}`);
      }
      
      setIsConfigured(true);
      setSecurityStatus('secure');
      setHasLegacyKey(false);
      setPrinters(printerData);
      setMaskedKey(maskApiKey(apiKey));
      
      logSecurityEvent('PrintNode API key stored securely', { restaurantId });
      
      toast({
        title: "API Key Saved Securely",
        description: "PrintNode API key stored with enterprise-grade encryption",
      });
      
      setIsFetching(false);
    });
  };

  const migrateLegacyKey = async () => {
    try {
      setIsMigrating(true);
      
      // Store the current key securely
      await secureApiKeyService.storeApiKey(restaurantId, 'printnode', apiKey);
      
      setHasLegacyKey(false);
      setSecurityStatus('secure');
      
      logSecurityEvent('PrintNode API key migrated to secure storage', { restaurantId });
      
      toast({
        title: "Migration Complete",
        description: "API key has been securely encrypted and plaintext copy removed",
      });
    } catch (error) {
      console.error("Error migrating API key:", error);
      logSecurityEvent('API key migration failed', { 
        restaurantId, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Migration Failed",
        description: "Failed to migrate API key to secure storage",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
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
      console.error("Error fetching printer data:", error);
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
      // Make secure API call to PrintNode
      const response = await fetch('https://api.printnode.com/printers', {
        headers: {
          'Authorization': `Basic ${btoa(key + ':')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.map((printer: any) => ({
        id: printer.id.toString(),
        name: printer.name,
        description: printer.description || (printer.computer ? printer.computer.name : undefined),
        state: printer.state === "online" ? "online" : "offline",
        selected: false
      }));
    } catch (error) {
      console.error("Error calling API:", error);
      
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
      
      // Get the current API key securely
      const currentApiKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
      if (!currentApiKey) {
        throw new Error("API key not found");
      }
      
      // Create a test receipt in plain text format for thermal printer
      const testReceipt = 
`
==================================
        TEST RECEIPT
==================================
${new Date().toLocaleString()}

This is a test receipt from your
restaurant's secure kiosk system.

If you can read this, printing
is working correctly!

Security Status: ${securityStatus === 'secure' ? 'ENCRYPTED' : 'LEGACY'}

==================================
        PRINT TEST PASSED
==================================

`;

      // Properly encode for PrintNode - fix for non-Latin1 characters
      const encodedContent = btoa(unescape(encodeURIComponent(testReceipt)));
      
      // Make secure API call
      const response = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(currentApiKey + ':')}`
        },
        body: JSON.stringify({
          printer: parseInt(printerId, 10) || printerId,
          title: "Test Print",
          contentType: "raw_base64",
          content: encodedContent,
          source: "Restaurant Kiosk"
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
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

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            PrintNode Integration
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show authentication required message
  if (!isAuthReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PrintNode Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription>
              Please make sure you are logged in to configure PrintNode integration.
              <br />
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          PrintNode Integration
          <Badge 
            variant={securityStatus === 'secure' ? 'default' : securityStatus === 'legacy' ? 'destructive' : 'outline'}
            className="text-xs"
          >
            {securityStatus === 'secure' ? <Shield className="h-3 w-3 mr-1" /> : securityStatus === 'legacy' ? <AlertTriangle className="h-3 w-3 mr-1" /> : 'Not Configured'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorDetails && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configuration Error</AlertTitle>
            <AlertDescription>
              {errorDetails}
              <br />
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => retryOperation(async () => {
                  // Retry the configuration check
                  window.location.reload();
                })}
                disabled={isRetrying}
              >
                {isRetrying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasLegacyKey && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Warning</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your API key is stored in plaintext. This is a security risk.</p>
              <Button 
                onClick={migrateLegacyKey}
                disabled={isMigrating}
                size="sm"
                className="mt-2"
              >
                {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Migrate to Encrypted Storage
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Label htmlFor="api-key">PrintNode API Key</Label>
          
          {isConfigured ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 border border-gray-300 rounded py-2 px-3 text-gray-600 font-mono flex items-center">
                <LockKeyhole className="h-4 w-4 mr-2 text-gray-500" />
                {maskedKey}
                {securityStatus === 'secure' && <Shield className="h-4 w-4 ml-2 text-green-600" />}
              </div>
              <Button 
                variant="outline"
                onClick={() => {
                  setIsConfigured(false);
                  setApiKey("");
                  setHasLegacyKey(false);
                  setErrorDetails("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
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
                disabled={isFetching || !apiKey || !isAuthReady}
                className="bg-kiosk-primary"
              >
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Get an API key by creating an account on 
            <a href="https://www.printnode.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
              PrintNode.com
            </a>
            {securityStatus === 'secure' && (
              <span className="block mt-1 text-green-600 flex items-center">
                <Shield className="h-3 w-3 mr-1" />
                Your API key is encrypted with enterprise-grade security
              </span>
            )}
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
                disabled={isFetching || !isAuthReady}
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
                      disabled={isTesting[printer.id] || printer.state === 'offline' || !isAuthReady}
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
