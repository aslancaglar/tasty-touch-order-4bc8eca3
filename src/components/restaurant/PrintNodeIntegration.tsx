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
import { logSecurityEvent, handleError } from "@/utils/error-handler";

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
  const [isAdmin, setIsAdmin] = useState(false);
  
  const { toast } = useToast();

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log("No user found");
          return;
        }

        console.log("Checking admin status for user:", user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error("Error checking admin status:", error);
          return;
        }
        
        const adminStatus = data?.is_admin || false;
        setIsAdmin(adminStatus);
        console.log("User admin status:", adminStatus);
        
        if (adminStatus) {
          console.log("User is confirmed admin - should have full API key access");
        }
      } catch (error) {
        console.error("Error in admin check:", error);
      }
    };
    
    checkAdminStatus();
  }, []);

  // Mask API key for display (show only last 4 characters)
  const maskApiKey = (key: string): string => {
    if (!key) return "";
    if (key.length <= 4) return "••••";
    return "•".repeat(key.length - 4) + key.slice(-4);
  };

  useEffect(() => {
    const checkApiKeyConfiguration = async () => {
      try {
        console.log("Checking API key configuration for restaurant:", restaurantId);
        
        // Check for encrypted key first
        const encryptedKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
        
        if (encryptedKey) {
          console.log("Found encrypted API key");
          setApiKey(encryptedKey);
          setMaskedKey(maskApiKey(encryptedKey));
          setIsConfigured(true);
          setSecurityStatus('secure');
          logSecurityEvent('Secure PrintNode API key loaded', { restaurantId });
          fetchPrinters(encryptedKey);
          return;
        }

        // Check for legacy plaintext key
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('api_key')
          .eq('restaurant_id', restaurantId)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error("Error fetching print config:", error);
          return;
        }
        
        if (data?.api_key) {
          console.log("Found legacy plaintext API key");
          setHasLegacyKey(true);
          setSecurityStatus('legacy');
          setApiKey(data.api_key);
          setMaskedKey(maskApiKey(data.api_key));
          setIsConfigured(true);
          logSecurityEvent('Legacy PrintNode API key detected', { 
            restaurantId,
            securityRisk: 'plaintext_storage'
          });
          fetchPrinters(data.api_key);
        }
      } catch (error) {
        console.error("Error checking API key configuration:", error);
        const errorDetails = handleError(error, 'API key configuration check');
        logSecurityEvent('API key configuration check failed', { 
          restaurantId, 
          ...errorDetails
        });
      }
    };
    
    checkApiKeyConfiguration();
  }, [restaurantId]);

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "API key cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsFetching(true);
      console.log("=== API KEY SAVE DEBUG ===");
      console.log("Restaurant ID:", restaurantId);
      console.log("User is admin:", isAdmin);
      
      // Get current user for debugging
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user ID:", user?.id);
      
      // First, test the API key by fetching printers
      console.log("Testing API key by fetching printers");
      const printerData = await fetchPrintersFromAPI(apiKey);
      
      if (printerData.length === 0) {
        console.log("API key test failed - no printers returned");
        toast({
          title: "API Key Invalid",
          description: "Unable to retrieve printers with this API key. Please check your API key and try again.",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`API key test successful - found ${printerData.length} printers`);
      
      // Store API key securely in vault
      console.log("Attempting to store API key securely...");
      
      try {
        await secureApiKeyService.storeApiKey(restaurantId, 'printnode', apiKey);
        console.log("API key stored successfully in secure vault");
      } catch (storeError) {
        console.error("Failed to store API key:", storeError);
        throw storeError;
      }
      
      // Update print config without the API key (remove plaintext storage)
      const printConfig: PrintConfig = {
        restaurant_id: restaurantId,
        configured_printers: []
      };

      console.log("Updating print config");
      const { error } = await supabase
        .from('restaurant_print_config')
        .upsert(printConfig, {
          onConflict: 'restaurant_id'
        });
      
      if (error) {
        console.error("Error updating print config:", error);
        throw error;
      }
      
      console.log("Print config updated successfully");
      
      setIsConfigured(true);
      setSecurityStatus('secure');
      setHasLegacyKey(false);
      setPrinters(printerData);
      setMaskedKey(maskApiKey(apiKey));
      
      logSecurityEvent('PrintNode API key stored securely', { 
        restaurantId,
        adminAccess: isAdmin 
      });
      
      toast({
        title: "API Key Saved Successfully",
        description: isAdmin ? 
          "PrintNode API key stored with enterprise-grade encryption (Admin Access)" :
          "PrintNode API key stored with enterprise-grade encryption",
      });
    } catch (error) {
      console.error("=== API KEY SAVE ERROR ===");
      console.error("Full error object:", error);
      console.error("Error message:", error?.message);
      console.error("Error type:", typeof error);
      
      const errorDetails = handleError(error, 'API key save');
      logSecurityEvent('API key save failed', { 
        restaurantId, 
        adminAccess: isAdmin,
        userId: (await supabase.auth.getUser()).data.user?.id,
        ...errorDetails
      });
      
      // Provide detailed error messages for debugging
      let errorMessage = "Error saving API key";
      if (error instanceof Error) {
        console.log("Error is instance of Error, message:", error.message);
        
        if (error.message.includes('Insufficient permissions')) {
          errorMessage = `Permission error: ${error.message}. Admin status: ${isAdmin}`;
        } else if (error.message.includes('User not authenticated')) {
          errorMessage = "Authentication error - please log out and log back in";
        } else {
          errorMessage = `Save failed: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = `Save failed: ${error}`;
      }
      
      console.log("Final error message to show user:", errorMessage);
      
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const migrateLegacyKey = async () => {
    try {
      setIsMigrating(true);
      console.log("Starting legacy key migration");
      
      // Store the current key securely
      await secureApiKeyService.storeApiKey(restaurantId, 'printnode', apiKey);
      console.log("Legacy key migrated to secure storage");
      
      // Clear the plaintext key
      await supabase
        .from('restaurant_print_config')
        .update({ api_key: null })
        .eq('restaurant_id', restaurantId);
      
      console.log("Plaintext key cleared from database");
      
      setHasLegacyKey(false);
      setSecurityStatus('secure');
      
      logSecurityEvent('PrintNode API key migrated to secure storage', { 
        restaurantId,
        adminAccess: isAdmin 
      });
      
      toast({
        title: "Migration Complete",
        description: "API key has been securely encrypted and plaintext copy removed",
      });
    } catch (error) {
      console.error("Error migrating API key:", error);
      const errorDetails = handleError(error, 'API key migration');
      logSecurityEvent('API key migration failed', { 
        restaurantId,
        adminAccess: isAdmin,
        ...errorDetails
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
      console.log("Fetching printers from API");
      
      const printerData = await fetchPrintersFromAPI(key);
      console.log(`Fetched ${printerData.length} printers`);
      
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
        title: "Printers Updated",
        description: `${printerData.length} printers retrieved successfully`,
      });
    } catch (error) {
      console.error("Error fetching printer data:", error);
      const errorDetails = handleError(error, 'Fetch printers');
      toast({
        title: "Error",
        description: "Error fetching printers: " + errorDetails.message,
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const fetchPrintersFromAPI = async (key: string): Promise<Printer[]> => {
    if (!key || key.length < 10) {
      console.log("Invalid API key provided");
      return [];
    }
    
    try {
      console.log("Making API call to PrintNode");
      // Make secure API call to PrintNode
      const response = await fetch('https://api.printnode.com/printers', {
        headers: {
          'Authorization': `Basic ${btoa(key + ':')}`
        }
      });
      
      console.log(`PrintNode API response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`PrintNode API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("PrintNode API response received:", data.length, "printers");
      
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
      
      throw error;
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
        description: "Printer configuration updated successfully",
      });
    } catch (error) {
      console.error("Error saving printer selection:", error);
      const errorDetails = handleError(error, 'Save printer selection');
      toast({
        title: "Error",
        description: "Error saving printer selection: " + errorDetails.message,
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
        throw new Error("API key not found - please reconfigure");
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
Access Level: ${isAdmin ? 'ADMIN' : 'OWNER'}

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
        console.error("Print job failed:", response.status, errorText);
        throw new Error(`Print job failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Print job sent successfully:", result);
      
      toast({
        title: "Test Print Sent",
        description: `Test print sent successfully to ${printer.name}`,
      });
    } catch (error) {
      console.error("Error testing printer:", error);
      const errorDetails = handleError(error, 'Test printer');
      toast({
        title: "Print Test Failed",
        description: errorDetails.message,
        variant: "destructive"
      });
    } finally {
      setIsTesting({ ...isTesting, [printerId]: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          PrintNode Integration
          <Badge 
            variant={securityStatus === 'secure' ? 'default' : securityStatus === 'legacy' ? 'destructive' : 'outline'}
            className="text-xs"
          >
            {securityStatus === 'secure' ? (
              <>
                <Shield className="h-3 w-3 mr-1" />
                Secure
              </>
            ) : securityStatus === 'legacy' ? (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Legacy
              </>
            ) : (
              'Not Configured'
            )}
          </Badge>
          {isAdmin && (
            <Badge variant="secondary" className="text-xs">
              Admin Access
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
                  setPrinters([]);
                  setSecurityStatus('none');
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
                disabled={isFetching || !apiKey}
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
                {isAdmin && " (Admin Access)"}
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
                <p className="text-sm text-muted-foreground mt-1">
                  Make sure your PrintNode client is running and printers are connected
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintNodeIntegration;
