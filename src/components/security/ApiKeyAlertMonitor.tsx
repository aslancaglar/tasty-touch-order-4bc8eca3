
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, RefreshCw, Clock, Eye, EyeOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { secureApiKeyService, type ApiKeyRotationAlert } from "@/services/secure-api-keys";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/config/security";

interface ApiKeyAlertMonitorProps {
  restaurantId?: string;
}

const ApiKeyAlertMonitor = ({ restaurantId }: ApiKeyAlertMonitorProps) => {
  const [alerts, setAlerts] = useState<ApiKeyRotationAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isAutoDeactivating, setIsAutoDeactivating] = useState(false);
  
  const { toast } = useToast();

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const alertData = await secureApiKeyService.getKeysNeedingRotationAlerts(restaurantId);
      setAlerts(alertData);
    } catch (error) {
      console.error("Error loading rotation alerts:", error);
      logSecurityEvent('Failed to load rotation alerts', { 
        restaurantId, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Error",
        description: "Failed to load rotation alerts",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runAutoDeactivation = async () => {
    try {
      setIsAutoDeactivating(true);
      const results = await secureApiKeyService.autoDeactivateOverdueKeys();
      
      logSecurityEvent('Auto-deactivation completed', { 
        deactivatedKeys: results.length,
        results 
      });
      
      toast({
        title: "Auto-Deactivation Complete",
        description: `${results.length} severely overdue keys have been deactivated`,
        variant: results.length > 0 ? "destructive" : "default"
      });
      
      await loadAlerts();
    } catch (error) {
      console.error("Error running auto-deactivation:", error);
      logSecurityEvent('Auto-deactivation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Auto-Deactivation Failed",
        description: "Failed to run automatic deactivation",
        variant: "destructive"
      });
    } finally {
      setIsAutoDeactivating(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [restaurantId]);

  const getAlertBadge = (level: string) => {
    const variants = {
      OK: "default",
      INFO: "secondary", 
      WARNING: "outline",
      CRITICAL: "destructive"
    } as const;
    
    const colors = {
      OK: "text-green-700 bg-green-50",
      INFO: "text-blue-700 bg-blue-50",
      WARNING: "text-amber-700 bg-amber-50", 
      CRITICAL: "text-red-700 bg-red-50"
    } as const;
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || "outline"} className={colors[level as keyof typeof colors]}>
        {level}
      </Badge>
    );
  };

  const criticalAlerts = alerts.filter(a => a.alert_level === 'CRITICAL').length;
  const warningAlerts = alerts.filter(a => a.alert_level === 'WARNING').length;
  const infoAlerts = alerts.filter(a => a.alert_level === 'INFO').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            API Key Rotation Alerts
            <Badge variant="outline" className="text-xs">
              {alerts.length} Keys
            </Badge>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runAutoDeactivation}
              disabled={isAutoDeactivating}
              className="text-destructive hover:text-destructive"
            >
              <Shield className={`h-4 w-4 ${isAutoDeactivating ? 'animate-spin' : ''}`} />
              Auto-Deactivate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAlerts}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalAlerts > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Security Alert</AlertTitle>
            <AlertDescription>
              {criticalAlerts} API key(s) are severely overdue for rotation and pose a security risk. 
              They should be rotated immediately or will be automatically deactivated.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{warningAlerts}</div>
              <p className="text-xs text-muted-foreground">Warning</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{infoAlerts}</div>
              <p className="text-xs text-muted-foreground">Info</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">Total Monitored</p>
            </CardContent>
          </Card>
        </div>

        {showDetails && alerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Rotation Alert Details</h4>
            {alerts.map((alert, index) => (
              <div key={`${alert.restaurant_id}-${alert.service_name}-${alert.key_name}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className={`h-4 w-4 ${
                    alert.alert_level === 'CRITICAL' ? 'text-red-600' : 
                    alert.alert_level === 'WARNING' ? 'text-amber-600' : 
                    alert.alert_level === 'INFO' ? 'text-blue-600' : 'text-green-600'
                  }`} />
                  <div>
                    <p className="font-medium">{alert.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Key: {alert.key_name} • {alert.days_since_rotation} days since rotation
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getAlertBadge(alert.alert_level)}
                </div>
              </div>
            ))}
          </div>
        )}

        {alerts.length === 0 && (
          <div className="text-center py-6 border rounded-md">
            <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-muted-foreground">All API keys are within rotation schedule</p>
          </div>
        )}
        
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Security Policy:</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Keys reaching 80% of their rotation interval trigger info alerts. 
            Keys exceeding their interval trigger warnings. 
            Keys exceeding 2x their interval are automatically deactivated for security.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyAlertMonitor;
