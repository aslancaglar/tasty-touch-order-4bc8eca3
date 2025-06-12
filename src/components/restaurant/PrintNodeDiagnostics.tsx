
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Printer, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { printNodeService } from "@/services/printnode-service";
import { debugApiKeyService } from "@/services/secure-api-keys";

interface PrintNodeDiagnosticsProps {
  restaurantId: string;
}

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error';
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
      // Test 1: Environment check
      try {
        await debugApiKeyService.diagnoseEnvironment();
        results.push({
          category: "Environment",
          status: "success",
          message: "Environment diagnostics completed"
        });
      } catch (error) {
        results.push({
          category: "Environment", 
          status: "error",
          message: `Environment check failed: ${error.message}`
        });
      }

      // Test 2: Secure API Key Service Health
      try {
        await debugApiKeyService.testConnection();
        results.push({
          category: "API Key Service",
          status: "success", 
          message: "Secure API Key Service is healthy"
        });
      } catch (error) {
        results.push({
          category: "API Key Service",
          status: "error",
          message: `API Key Service failed: ${error.message}`
        });
      }

      // Test 3: PrintNode Configuration
      try {
        const config = await printNodeService.getConfiguration(restaurantId);
        if (config.isConfigured) {
          results.push({
            category: "PrintNode Config",
            status: "success",
            message: `Configured with ${config.printerIds.length} printer(s)`,
            details: { printerIds: config.printerIds }
          });
        } else if (config.apiKey && config.printerIds.length === 0) {
          results.push({
            category: "PrintNode Config",
            status: "warning",
            message: "API key found but no printers configured"
          });
        } else if (!config.apiKey) {
          results.push({
            category: "PrintNode Config",
            status: "error",
            message: "No PrintNode API key configured"
          });
        }
      } catch (error) {
        results.push({
          category: "PrintNode Config",
          status: "error",
          message: `Configuration check failed: ${error.message}`
        });
      }

      // Test 4: PrintNode Connection
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
          results.push({
            category: "Database Config",
            status: "success",
            message: "Print configuration found in database",
            details: printConfig
          });
        } else {
          results.push({
            category: "Database Config",
            status: "warning",
            message: "No print configuration found in database"
          });
        }
      } catch (error) {
        results.push({
          category: "Database Config",
          status: "error",
          message: `Database check failed: ${error.message}`
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
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default' as const,
      warning: 'secondary' as const,
      error: 'destructive' as const
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
          PrintNode Diagnostics
        </CardTitle>
        <CardDescription>
          Test PrintNode configuration and troubleshoot issues
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
              Running Diagnostics...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4 mr-2" />
              Run Diagnostics
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
      </CardContent>
    </Card>
  );
};

export default PrintNodeDiagnostics;
