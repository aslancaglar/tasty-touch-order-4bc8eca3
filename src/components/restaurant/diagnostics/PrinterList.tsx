
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Printer {
  name: string;
  driver?: string;
  status?: string;
}

interface PrinterListProps {
  printers: Printer[];
  onTestPrint: (printerName: string) => void;
  isRunning: boolean;
}

const PrinterList: React.FC<PrinterListProps> = ({
  printers,
  onTestPrint,
  isRunning
}) => {
  return (
    <div>
      <h4 className="font-medium mb-2 flex items-center gap-2">
        <Printer className="h-4 w-4" />
        Available Printers ({printers.length})
      </h4>
      
      {printers.length > 0 ? (
        <div className="space-y-2">
          {printers.map((printer, index) => (
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
                onClick={() => onTestPrint(printer.name)}
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
  );
};

export default PrinterList;
