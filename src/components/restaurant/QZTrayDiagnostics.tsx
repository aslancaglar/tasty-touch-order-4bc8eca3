import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wifi, WifiOff, Printer, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QZTrayDiagnosticsProps {
  restaurantId: string;
}

interface DiagnosticResult {
  qzAvailable: boolean;
  qzVersion?: string;
  websocketConnected: boolean;
  printers: Array<{
    name: string;
    driver?: string;
    status?: string;
  }>;
  errors: string[];
}

const QZTrayDiagnostics: React.FC<QZTrayDiagnosticsProps> = ({ restaurantId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-run diagnostics on component mount
    runDiagnostics();
  }, []);

  const checkWebSocketStatus = (): boolean => {
    if (!window.qz || !window.qz.websocket) {
      return false;
    }
    
    try {
      // Check if QZ Tray websocket is already connected
      return window.qz.websocket.isActive();
    } catch (error) {
      console.warn("Could not check WebSocket status:", error);
      return false;
    }
  };

  const setupSecurityConfig = async () => {
    console.log("🔐 Setting up security configuration...");
    
    // Try multiple security approaches
    const approaches = [
      // Approach 1: Use QZ Tray's built-in certificate handling
      () => {
        console.log("Trying built-in certificate handling...");
        window.qz.security.setCertificatePromise(() => {
          if (window.qz.security.requestSignature) {
            return window.qz.security.requestSignature();
          }
          return Promise.resolve();
        });
        window.qz.security.setSignaturePromise((toSign: string) => {
          if (window.qz.security.requestSignature) {
            return window.qz.security.requestSignature(toSign);
          }
          return Promise.resolve();
        });
      },
      // Approach 2: Bypass security entirely
      () => {
        console.log("Trying bypass security...");
        window.qz.security.setCertificatePromise(() => Promise.resolve());
        window.qz.security.setSignaturePromise(() => Promise.resolve());
      },
      // Approach 3: Return empty strings
      () => {
        console.log("Trying empty string security...");
        window.qz.security.setCertificatePromise(() => Promise.resolve(''));
        window.qz.security.setSignaturePromise(() => Promise.resolve(''));
      }
    ];

    for (let i = 0; i < approaches.length; i++) {
      try {
        approaches[i]();
        await window.qz.websocket.connect();
        console.log(`✅ Security approach ${i + 1} successful`);
        return true;
      } catch (error) {
        console.log(`❌ Security approach ${i + 1} failed:`, error);
        if (window.qz.websocket.isActive()) {
          try {
            await window.qz.websocket.disconnect();
          } catch (disconnectError) {
            console.warn("Error disconnecting after failed approach:", disconnectError);
          }
        }
      }
    }
    
    return false;
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults(null);

    const diagnosticResult: DiagnosticResult = {
      qzAvailable: false,
      websocketConnected: false,
      printers: [],
      errors: []
    };

    try {
      console.log("🔍 Starting QZ Tray diagnostics...");

      // Step 1: Check if QZ Tray script is available
      console.log("📦 Checking QZ Tray script availability...");
      
      // Try to load QZ Tray script if not already loaded
      if (!window.qz) {
        console.log("📥 Loading QZ Tray script...");
        try {
          await loadQZTrayScript();
          console.log("✅ QZ Tray script loaded successfully");
        } catch (error) {
          console.error("❌ Failed to load QZ Tray script:", error);
          diagnosticResult.errors.push("Failed to load QZ Tray script");
        }
      } else {
        console.log("✅ QZ Tray script already available");
      }

      if (window.qz) {
        diagnosticResult.qzAvailable = true;
        
        // Get QZ Tray version
        try {
          diagnosticResult.qzVersion = window.qz.version || "Unknown";
          console.log(`📋 QZ Tray version: ${diagnosticResult.qzVersion}`);
        } catch (error) {
          console.warn("⚠️ Could not get QZ Tray version:", error);
        }

        // Step 2: Check WebSocket connection status
        console.log("🔌 Checking WebSocket connection status...");
        
        const isAlreadyConnected = checkWebSocketStatus();
        console.log(`WebSocket already connected: ${isAlreadyConnected}`);

        if (isAlreadyConnected) {
          console.log("✅ WebSocket already connected");
          diagnosticResult.websocketConnected = true;
          
          // Get printers directly since we're already connected
          await getPrintersFromQZ(diagnosticResult);
        } else {
          // Try to connect with multiple security approaches
          try {
            console.log("🔌 Attempting WebSocket connection with smart security...");
            const connected = await setupSecurityConfig();
            
            if (connected) {
              diagnosticResult.websocketConnected = true;
              console.log("✅ WebSocket connected successfully");

              // Get printers
              await getPrintersFromQZ(diagnosticResult);

              // Disconnect after diagnostics
              try {
                await window.qz.websocket.disconnect();
                console.log("🔌 WebSocket disconnected");
              } catch (disconnectError) {
                console.warn("⚠️ Error disconnecting WebSocket:", disconnectError);
              }
            } else {
              throw new Error("All security approaches failed");
            }

          } catch (connectionError) {
            console.error("❌ WebSocket connection failed:", connectionError);
            diagnosticResult.errors.push(`WebSocket connection failed: ${connectionError.message}`);
          }
        }
      } else {
        diagnosticResult.errors.push("QZ Tray script not available");
      }

    } catch (generalError) {
      console.error("❌ General diagnostic error:", generalError);
      diagnosticResult.errors.push(`General error: ${generalError.message}`);
    }

    console.log("🏁 Diagnostics complete:", diagnosticResult);
    setResults(diagnosticResult);
    setIsRunning(false);

    // Show summary toast
    if (diagnosticResult.websocketConnected && diagnosticResult.printers.length > 0) {
      toast({
        title: "QZ Tray Diagnostics",
        description: `✅ Connected! Found ${diagnosticResult.printers.length} printer(s)`,
      });
    } else {
      toast({
        title: "QZ Tray Diagnostics",
        description: `❌ Issues detected. Check details below.`,
        variant: "destructive"
      });
    }
  };

  const getPrintersFromQZ = async (diagnosticResult: DiagnosticResult) => {
    console.log("🖨️ Fetching available printers...");
    try {
      const printers = await window.qz.printers.find();
      console.log("📄 Raw printers response:", printers);

      if (Array.isArray(printers)) {
        diagnosticResult.printers = printers.map((printer: any) => ({
          name: printer.name || printer,
          driver: printer.driver || 'Unknown',
          status: printer.status || 'Unknown'
        }));
        console.log(`✅ Found ${diagnosticResult.printers.length} printers:`, diagnosticResult.printers);
      } else {
        console.log("⚠️ Printers response is not an array:", typeof printers);
        diagnosticResult.errors.push("Invalid printers response format");
      }
    } catch (printerError) {
      console.error("❌ Failed to get printers:", printerError);
      diagnosticResult.errors.push(`Failed to get printers: ${printerError.message}`);
    }
  };

  const loadQZTrayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QZ Tray script'));
      document.head.appendChild(script);
    });
  };

  const testPrint = async (printerName: string) => {
    if (!window.qz) {
      toast({
        title: "Error",
        description: "QZ Tray not available",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`🖨️ Testing print to: ${printerName}`);
      
      const wasConnected = checkWebSocketStatus();
      
      if (!wasConnected) {
        // Connect if not already connected with smart security
        console.log("🔐 Setting up security for test print...");
        const connected = await setupSecurityConfig();
        if (!connected) {
          throw new Error("Failed to connect for test print");
        }
      }

      // Create test print job
      const config = window.qz.configs.create(printerName);
      const testContent = "QZ Tray Test Print\n" + 
                         "===================\n" + 
                         "Date: " + new Date().toLocaleString() + "\n" + 
                         "Printer: " + printerName + "\n" + 
                         "Restaurant ID: " + restaurantId + "\n" + 
                         "===================\n\n\n\n";

      const data = [{
        type: 'raw',
        format: 'plain',
        data: testContent
      }];

      await window.qz.print(config, data);
      
      toast({
        title: "Test Print Sent",
        description: `Test print sent to ${printerName}`,
      });

      // Only disconnect if we connected in this function
      if (!wasConnected) {
        await window.qz.websocket.disconnect();
      }
      
    } catch (error) {
      console.error("❌ Test print failed:", error);
      toast({
        title: "Test Print Failed",
        description: `Error: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          QZ Tray Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            "Run QZ Tray Diagnostics"
          )}
        </Button>

        {results && (
          <div className="space-y-4">
            {/* QZ Tray Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={results.qzAvailable ? "default" : "destructive"}>
                  {results.qzAvailable ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  QZ Script {results.qzAvailable ? "Loaded" : "Failed"}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={results.websocketConnected ? "default" : "destructive"}>
                  {results.websocketConnected ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  WebSocket {results.websocketConnected ? "Connected" : "Failed"}
                </Badge>
              </div>
            </div>

            {/* Version Info */}
            {results.qzVersion && (
              <div className="text-sm text-muted-foreground">
                QZ Tray Version: {results.qzVersion}
              </div>
            )}

            {/* Printers */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Available Printers ({results.printers.length})
              </h4>
              
              {results.printers.length > 0 ? (
                <div className="space-y-2">
                  {results.printers.map((printer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{printer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Driver: {printer.driver} | Status: {printer.status}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testPrint(printer.name)}
                        disabled={isRunning}
                      >
                        Test Print
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-muted-foreground border rounded-md">
                  No printers found
                </div>
              )}
            </div>

            {/* Errors */}
            {results.errors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                <div className="space-y-1">
                  {results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Troubleshooting */}
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium mb-2">Troubleshooting Steps:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                <li>Ensure QZ Tray desktop application is installed and running</li>
                <li>Check that printers are connected and powered on</li>
                <li>Verify printer drivers are installed</li>
                <li>If using HTTPS, ensure certificate is properly installed in QZ Tray</li>
                <li>Try running QZ Tray as administrator</li>
                <li>Check firewall/antivirus settings</li>
                <li>Verify QZ Tray certificate is trusted by the browser</li>
                <li>For persistent signing errors, try reinstalling QZ Tray certificate</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QZTrayDiagnostics;
