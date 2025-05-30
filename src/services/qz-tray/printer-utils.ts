
import { setupQZTraySecurityConfig, checkWebSocketStatus } from './security-config';

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

export const getPrintersFromQZ = async (diagnosticResult: DiagnosticResult) => {
  console.log("🖨️ Fetching available printers...");
  try {
    // Ensure we have a stable connection before fetching printers
    if (!window.qz.websocket.isActive()) {
      console.log("WebSocket not active, attempting to reconnect...");
      const connected = await setupQZTraySecurityConfig();
      if (!connected) {
        throw new Error("Failed to establish WebSocket connection");
      }
    }

    const printers = await window.qz.printers.find();
    console.log("📄 Raw printers response:", printers);

    if (Array.isArray(printers)) {
      diagnosticResult.printers = printers.map((printer: any) => ({
        name: printer.name || printer,
        driver: printer.driver || 'Unknown',
        status: printer.status || 'Unknown'
      }));
      console.log(`✅ Found ${diagnosticResult.printers.length} printers:`, diagnosticResult.printers);
    } else if (typeof printers === 'string') {
      // Sometimes QZ returns a single printer as a string
      diagnosticResult.printers = [{
        name: printers,
        driver: 'Unknown',
        status: 'Unknown'
      }];
      console.log(`✅ Found 1 printer: ${printers}`);
    } else {
      console.log("⚠️ Printers response is not an array or string:", typeof printers);
      diagnosticResult.errors.push("Invalid printers response format");
    }
  } catch (printerError) {
    console.error("❌ Failed to get printers:", printerError);
    diagnosticResult.errors.push(`Failed to get printers: ${printerError.message}`);
  }
};

export const testPrintToPrinter = async (printerName: string, restaurantId: string): Promise<void> => {
  if (!window.qz) {
    throw new Error("QZ Tray not available");
  }

  console.log(`🖨️ Testing print to: ${printerName}`);
  
  const wasConnected = checkWebSocketStatus();
  
  if (!wasConnected) {
    console.log("🔐 Setting up security for test print...");
    const connected = await setupQZTraySecurityConfig();
    if (!connected) {
      throw new Error("Failed to connect for test print");
    }
  }

  try {
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
    console.log(`✅ Test print sent successfully to ${printerName}`);

  } catch (printError) {
    console.error(`❌ Print error for ${printerName}:`, printError);
    throw new Error(`Print failed: ${printError.message}`);
  } finally {
    // Only disconnect if we weren't connected before
    if (!wasConnected && window.qz.websocket.isActive()) {
      try {
        await window.qz.websocket.disconnect();
        console.log("🔌 Disconnected after test print");
      } catch (disconnectError) {
        console.warn("⚠️ Error disconnecting after test print:", disconnectError);
      }
    }
  }
};
