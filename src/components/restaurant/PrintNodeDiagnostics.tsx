
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Printer, Settings, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printNodeService } from "@/services/printnode-service";
import { debugApiKeyService } from "@/services/secure-api-keys";

interface PrintNodeDiagnosticsProps {
  restaurantId: string;
}

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: any;
}

export const PrintNodeDiagnostics: React.FC<PrintNodeDiagnosticsProps> = ({ restaurantId }) => {
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      console.log(`[PrintNodeDiagnostics] Starting comprehensive diagnostics for restaurant: ${restaurantId}`);

      // Test 1: Environment check
      try {
        await debugApiKeyService.diagnoseEnvironment();
        results.push({
          category: "Environment",
          status: "success",
          message: "Environment and authentication validated"
        });
      } catch (error) {
        results.push({
          category: "Environment", 
          status: "error",
          message: `Environment check failed: ${error.message}`
        });
      }

      // Test 2: Restaurant Context Validation
      try {
        const contextValidation = await debugApiKeyService.testRetrieveKey(restaurantId, 'printnode');
        results.push({
          category: "Restaurant Access",
          status: "success",
          message: "Restaurant access and permissions verified"
        });
      } catch (error) {
        results.push({
          category: "Restaurant Access",
          status: "error",
          message: `Access validation failed: ${error.message}`
        });
      }

      // Test 3: Enhanced PrintNode Configuration Check
      try {
        const diagnosticResult = await printNodeService.diagnoseConfiguration(restaurantId);
        
        // Add each diagnostic test as a separate result
        diagnosticResult.diagnostics.forEach(diagnostic => {
          results.push({
            category: `PrintNode ${diagnostic.test}`,
            status: diagnostic.passed ? "success" : "error",
            message: diagnostic.message,
            details: diagnostic.details
          });
        });

        // Overall configuration status
        if (diagnosticResult.success) {
          results.push({
            category: "PrintNode Configuration",
            status: "success",
            message: "PrintNode is fully configured and operational"
          });
        } else {
          results.push({
            category: "PrintNode Configuration",
            status: "error",
            message: "PrintNode configuration has issues that need attention"
          });
        }

      } catch (error) {
        results.push({
          category: "PrintNode Configuration",
          status: "error",
          message: `Configuration diagnosis failed: ${error.message}`
        });
      }

      // Test 4: PrintNode Connection Test
      try {
        const connectionTest = await printNodeService.testConnection(restaurantId);
        results.push({
          category: "PrintNode Connection",
          status: connectionTest.success ? "success" : "error",
          message: connectionTest.message,
          details: connectionTest.details
        });
      } catch (error) {
        results.push({
          category: "PrintNode Connection",
          status: "error",
          message: `Connection test failed: ${error.message}`
        });
      }

      // Test 5: Database Print Configuration
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (printConfig) {
          const printerCount = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers.length : 0;
          results.push({
            category: "Database Configuration",
            status: printerCount > 0 ? "success" : "warning",
            message: printerCount > 0 
              ? `Print configuration found with ${printerCount} printer(s)` 
              : "Print configuration found but no printers configured",
            details: {
              ...printConfig,
              printerCount
            }
          });
        } else {
          results.push({
            category: "Database Configuration",
            status: "warning",
            message: "No print configuration found in database"
          });
        }
      } catch (error) {
        results.push({
          category: "Database Configuration",
          status: "error",
          message: `Database check failed: ${error.message}`
        });
      }

      // Test 6: API Key Service Detailed Analysis
      try {
        await debugApiKeyService.debugRestaurantApiKeys(restaurantId);
        results.push({
          category: "API Key Analysis",
          status: "info",
          message: "Detailed API key analysis completed (check console for details)"
        });
      } catch (error) {
        results.push({
          category: "API Key Analysis",
          status: "error",
          message: `API key analysis failed: ${error.message}`
        });
      }

      setDiagnostics(results);

      // Show summary toast
      const errorCount = results.filter(r => r.status === 'error').length;
      const warningCount = results.filter(r => r.status === 'warning').length;

      if (errorCount === 0 && warningCount === 0) {
        toast({
          title: "Diagnostics Complete",
          description: "All systems are working correctly",
        });
      } else {
        toast({
          title: "Diagnostics Complete",
          description: `Found ${errorCount} errors and ${warningCount} warnings`,
          variant: errorCount > 0 ? "destructive" : "default"
        });
      }

    } catch (error) {
      console.error("Diagnostics failed:", error);
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default' as const,
      warning: 'secondary' as const,
      error: 'destructive' as const,
      info: 'outline' as const
    };
    
    return (
      <Badge variant={variants[status]} className="ml-auto">
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Enhanced PrintNode Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive testing and troubleshooting for PrintNode configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Comprehensive Diagnostics...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4 mr-2" />
              Run Enhanced Diagnostics
            </>
          )}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Diagnostic Results</h3>
            {diagnostics.map((result, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.category}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        Show Details
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {diagnostics.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Open your browser's developer console (F12) to see detailed logs 
              that can help identify specific issues with PrintNode configuration.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrintNodeDiagnostics;
