
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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

export const useQZTrayDiagnostics = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult | null>(null);
  const { toast } = useToast();

  const checkWebSocketStatus = (): boolean => {
    if (!window.qz || !window.qz.websocket) {
      return false;
    }
    
    try {
      return window.qz.websocket.isActive();
    } catch (error) {
      console.warn("Could not check WebSocket status:", error);
      return false;
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

  const setupSecurityConfig = async () => {
    console.log("🔐 Setting up security configuration...");
    
    const approaches = [
      // Approach 1: Use proper certificate handling for installed certificates
      () => {
        console.log("Trying installed certificate approach...");
        window.qz.security.setCertificatePromise(() => {
          return new Promise((resolve) => {
            console.log("Using installed certificate");
            resolve();
          });
        });
        window.qz.security.setSignaturePromise((toSign: string) => {
          return new Promise((resolve) => {
            console.log("Signing with installed certificate, data:", toSign);
            resolve();
          });
        });
      },
      // Approach 2: Direct function returns
      () => {
        console.log("Trying direct function returns...");
        window.qz.security.setCertificatePromise(() => Promise.resolve());
        window.qz.security.setSignaturePromise(() => Promise.resolve());
      },
      // Approach 3: Return empty strings
      () => {
        console.log("Trying empty string returns...");
        window.qz.security.setCertificatePromise(() => Promise.resolve(''));
        window.qz.security.setSignaturePromise(() => Promise.resolve(''));
      },
      // Approach 4: Use QZ Tray's built-in certificate management
      () => {
        console.log("Trying QZ Tray built-in certificate management...");
        if (window.qz.security.requestSignature) {
          window.qz.security.setCertificatePromise(() => {
            return window.qz.security.requestSignature();
          });
          window.qz.security.setSignaturePromise((toSign: string) => {
            return window.qz.security.requestSignature(toSign);
          });
        } else {
          throw new Error("Built-in certificate management not available");
        }
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
        
        try {
          diagnosticResult.qzVersion = window.qz.version || "Unknown";
          console.log(`📋 QZ Tray version: ${diagnosticResult.qzVersion}`);
        } catch (error) {
          console.warn("⚠️ Could not get QZ Tray version:", error);
        }

        console.log("🔌 Checking WebSocket connection status...");
        
        const isAlreadyConnected = checkWebSocketStatus();
        console.log(`WebSocket already connected: ${isAlreadyConnected}`);

        if (isAlreadyConnected) {
          console.log("✅ WebSocket already connected");
          diagnosticResult.websocketConnected = true;
          await getPrintersFromQZ(diagnosticResult);
        } else {
          try {
            console.log("🔌 Attempting WebSocket connection with smart security...");
            const connected = await setupSecurityConfig();
            
            if (connected) {
              diagnosticResult.websocketConnected = true;
              console.log("✅ WebSocket connected successfully");
              await getPrintersFromQZ(diagnosticResult);

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

  const testPrint = async (printerName: string, restaurantId: string) => {
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
        console.log("🔐 Setting up security for test print...");
        const connected = await setupSecurityConfig();
        if (!connected) {
          throw new Error("Failed to connect for test print");
        }
      }

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

  return {
    isRunning,
    results,
    runDiagnostics,
    testPrint
  };
};
