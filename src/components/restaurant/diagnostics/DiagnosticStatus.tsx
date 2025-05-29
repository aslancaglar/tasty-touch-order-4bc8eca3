
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react";

interface DiagnosticStatusProps {
  qzAvailable: boolean;
  websocketConnected: boolean;
  qzVersion?: string;
}

const DiagnosticStatus: React.FC<DiagnosticStatusProps> = ({
  qzAvailable,
  websocketConnected,
  qzVersion
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Badge variant={qzAvailable ? "default" : "destructive"}>
            {qzAvailable ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            QZ Script {qzAvailable ? "Loaded" : "Failed"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={websocketConnected ? "default" : "destructive"}>
            {websocketConnected ? (
              <Wifi className="h-3 w-3 mr-1" />
            ) : (
              <WifiOff className="h-3 w-3 mr-1" />
            )}
            WebSocket {websocketConnected ? "Connected" : "Failed"}
          </Badge>
        </div>
      </div>

      {qzVersion && (
        <div className="text-sm text-muted-foreground">
          QZ Tray Version: {qzVersion}
        </div>
      )}
    </div>
  );
};

export default DiagnosticStatus;
