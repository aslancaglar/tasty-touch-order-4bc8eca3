
import { loadQZTrayScript } from '@/utils/qz-tray-loader';
import { setupQZTraySecurityConfig, checkWebSocketStatus } from './security-config';
import { getPrintersFromQZ } from './printer-utils';

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

export const runQZTrayDiagnostics = async (): Promise<DiagnosticResult> => {
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
          const connected = await setupQZTraySecurityConfig();
          
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
  return diagnosticResult;
};
