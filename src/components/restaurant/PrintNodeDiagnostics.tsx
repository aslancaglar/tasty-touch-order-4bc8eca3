
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Stethoscope, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  Info,
  Wifi,
  Key,
  Printer,
  Shield,
  Database
} from "lucide-react";
import { printNodeService, DiagnosticResult, DiagnosticResponse } from "@/services/printnode-service";
import { toast } from "@/hooks/use-toast";

interface PrintNodeDiagnosticsProps {
  restaurantId: string;
}

const PrintNodeDiagnostics: React.FC<PrintNodeDiagnosticsProps> = ({ restaurantId }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResponse | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const runDiagnostics = async () => {
    setIsRunning(true);
    setDiagnostics(null);
    
    try {
      console.log("[PrintNodeDiagnostics] Starting comprehensive diagnostics...");
      const result = await printNodeService.diagnoseConfiguration(restaurantId);
      setDiagnostics(result);
      
      if (result.success) {
        toast({
          title: "Diagnostics Complete",
          description: "All systems are working correctly",
        });
      } else {
        toast({
          title: "Issues Detected",
          description: "Some problems were found. Check the details below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[PrintNodeDiagnostics] Diagnostic error:", error);
      toast({
        title: "Diagnostic Failed",
        description: "Unable to complete system diagnostics",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleExpanded = (testName: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedItems(newExpanded);
  };

  const getTestIcon = (test: DiagnosticResult) => {
    const iconClass = "h-4 w-4";
    
    switch (test.test) {
      case "Restaurant ID Validation":
        return <Database className={iconClass} />;
      case "Authentication Context":
        return <Shield className={iconClass} />;
      case "API Key Retrieval":
      case "API Key Validation":
        return <Key className={iconClass} />;
      case "Printer Configuration":
        return <Printer className={iconClass} />;
      case "Network Connectivity":
        return <Wifi className={iconClass} />;
      default:
        return <Info className={iconClass} />;
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"} className="ml-2">
        {passed ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          PrintNode System Diagnostics
        </CardTitle>
        <CardDescription>
          Run comprehensive tests to identify and troubleshoot printing issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Diagnostics...' : 'Run Full Diagnostics'}
          </Button>
          
          {diagnostics?.context && (
            <div className="text-sm text-muted-foreground">
              Last run: {new Date(diagnostics.context.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running comprehensive system checks...
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>• Validating restaurant context</div>
              <div>• Checking authentication</div>
              <div>• Testing API key retrieval</div>
              <div>• Validating with PrintNode</div>
              <div>• Checking printer configuration</div>
              <div>• Testing network connectivity</div>
            </div>
          </div>
        )}

        {diagnostics && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg border-2 ${
              diagnostics.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {diagnostics.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {diagnostics.success 
                    ? 'All Systems Operational' 
                    : 'Issues Detected'
                  }
                </span>
                <Badge variant={diagnostics.success ? "default" : "destructive"}>
                  {diagnostics.diagnostics.filter(d => d.passed).length}/{diagnostics.diagnostics.length} Tests Passed
                </Badge>
              </div>
            </div>

            {/* System Context */}
            {diagnostics.context && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium mb-2">System Context</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Restaurant ID: {diagnostics.context.restaurantId}</div>
                  <div>Environment: {diagnostics.context.isDevelopment ? 'Development' : 'Production'}</div>
                  <div>Timestamp: {new Date(diagnostics.context.timestamp).toLocaleString()}</div>
                  <div>User Agent: {diagnostics.context.userAgent.substring(0, 50)}...</div>
                </div>
              </div>
            )}

            {/* Diagnostic Results */}
            <div className="space-y-2">
              <h4 className="font-medium">Detailed Test Results</h4>
              {diagnostics.diagnostics.map((test, index) => (
                <Collapsible key={index}>
                  <CollapsibleTrigger 
                    className="w-full"
                    onClick={() => toggleExpanded(test.test)}
                  >
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test)}
                        <span className="font-medium">{test.test}</span>
                        {getStatusIcon(test.passed)}
                        {getStatusBadge(test.passed)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {test.message}
                        </span>
                        {expandedItems.has(test.test) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {test.details && (
                      <div className="p-3 mt-1 bg-gray-50 rounded-lg border">
                        <div className="text-sm font-medium mb-2">Technical Details</div>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>

            {/* Recommendations */}
            {!diagnostics.success && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">Recommended Actions</span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {diagnostics.diagnostics
                    .filter(d => !d.passed)
                    .map((test, index) => (
                      <li key={index}>• {test.message}</li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintNodeDiagnostics;
