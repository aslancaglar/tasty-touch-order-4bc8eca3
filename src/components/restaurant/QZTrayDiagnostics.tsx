
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useQZTrayDiagnostics } from "@/hooks/useQZTrayDiagnostics";
import DiagnosticStatus from "./diagnostics/DiagnosticStatus";
import PrinterList from "./diagnostics/PrinterList";
import ErrorDisplay from "./diagnostics/ErrorDisplay";
import TroubleshootingGuide from "./diagnostics/TroubleshootingGuide";

interface QZTrayDiagnosticsProps {
  restaurantId: string;
}

const QZTrayDiagnostics: React.FC<QZTrayDiagnosticsProps> = ({ restaurantId }) => {
  const { isRunning, results, runDiagnostics, testPrint } = useQZTrayDiagnostics();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const handleTestPrint = (printerName: string) => {
    testPrint(printerName, restaurantId);
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
            <DiagnosticStatus
              qzAvailable={results.qzAvailable}
              websocketConnected={results.websocketConnected}
              qzVersion={results.qzVersion}
            />

            <PrinterList
              printers={results.printers}
              onTestPrint={handleTestPrint}
              isRunning={isRunning}
            />

            <ErrorDisplay errors={results.errors} />

            <TroubleshootingGuide />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QZTrayDiagnostics;
