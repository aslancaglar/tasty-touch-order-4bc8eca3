
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { runQZTrayDiagnostics } from '@/services/qz-tray/diagnostics-service';
import { testPrintToPrinter } from '@/services/qz-tray/printer-utils';

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

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const diagnosticResult = await runQZTrayDiagnostics();
      setResults(diagnosticResult);

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
    } catch (error) {
      console.error("❌ Diagnostics failed:", error);
      toast({
        title: "QZ Tray Diagnostics",
        description: `❌ Diagnostics failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testPrint = async (printerName: string, restaurantId: string) => {
    try {
      await testPrintToPrinter(printerName, restaurantId);
      
      toast({
        title: "Test Print Sent",
        description: `Test print sent to ${printerName}`,
      });
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
