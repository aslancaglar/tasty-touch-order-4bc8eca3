
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Key } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { secureApiKeyService } from "@/services/secure-api-keys";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/config/security";
import ApiKeySecurityMonitor from "./ApiKeySecurityMonitor";
import ApiKeyAlertMonitor from "./ApiKeyAlertMonitor";
import ApiKeyRotationAudit from "./ApiKeyRotationAudit";

interface SecurityHardeningDashboardProps {
  restaurantId: string;
}

const SecurityHardeningDashboard = ({ restaurantId }: SecurityHardeningDashboardProps) => {
  const [securityStatus, setSecurityStatus] = useState<'loading' | 'secure' | 'warning' | 'critical'>('loading');
  const [apiKeyCount, setApiKeyCount] = useState(0);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  
  const { toast } = useToast();

  const assessSecurityStatus = async () => {
    try {
      const [apiKeys, rotationAlerts] = await Promise.all([
        secureApiKeyService.getApiKeyRecords(restaurantId),
        secureApiKeyService.getKeysNeedingRotationAlerts(restaurantId)
      ]);

      setApiKeyCount(apiKeys.length);

      const criticalAlerts = rotationAlerts.filter(a => a.alert_level === 'CRITICAL').length;
      const warningAlerts = rotationAlerts.filter(a => a.alert_level === 'WARNING').length;

      if (criticalAlerts > 0) {
        setSecurityStatus('critical');
      } else if (warningAlerts > 0) {
        setSecurityStatus('warning');
      } else {
        setSecurityStatus('secure');
      }

      logSecurityEvent('Security status assessment completed', {
        restaurantId,
        apiKeyCount: apiKeys.length,
        criticalAlerts,
        warningAlerts,
        status: criticalAlerts > 0 ? 'critical' : warningAlerts > 0 ? 'warning' : 'secure'
      });

    } catch (error) {
      console.error("Error assessing security status:", error);
      setSecurityStatus('warning');
      toast({
        title: "Security Assessment Error",
        description: "Unable to fully assess security status",
        variant: "destructive"
      });
    }
  };

  const runSecurityAudit = async () => {
    try {
      setIsRunningAudit(true);
      
      // Run comprehensive security checks
      const [rotationResults, migrationResults, alertResults] = await Promise.all([
        secureApiKeyService.forceRotateOverdueKeys(),
        secureApiKeyService.migratePrintNodeKeys(),
        secureApiKeyService.autoDeactivateOverdueKeys()
      ]);

      const totalActions = rotationResults.length + migrationResults.length + alertResults.length;

      logSecurityEvent('Comprehensive security audit completed', {
        restaurantId,
        rotationResults: rotationResults.length,
        migrationResults: migrationResults.length,
        alertResults: alertResults.length,
        totalActions
      });

      toast({
        title: "Security Audit Complete",
        description: `${totalActions} security actions completed`,
        variant: totalActions > 0 ? "default" : "default"
      });

      await assessSecurityStatus();
    } catch (error) {
      console.error("Error running security audit:", error);
      logSecurityEvent('Security audit failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Security Audit Failed",
        description: "Failed to complete security audit",
        variant: "destructive"
      });
    } finally {
      setIsRunningAudit(false);
    }
  };

  useEffect(() => {
    assessSecurityStatus();
  }, [restaurantId]);

  const getStatusBadge = () => {
    switch (securityStatus) {
      case 'secure':
        return <Badge variant="default" className="text-green-700 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Secure</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="text-amber-700 bg-amber-50"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Critical</Badge>;
      default:
        return <Badge variant="outline">Assessing...</Badge>;
    }
  };

  const getStatusDescription = () => {
    switch (securityStatus) {
      case 'secure':
        return "All API keys are properly encrypted and within rotation schedules.";
      case 'warning':
        return "Some API keys require attention but no immediate security risk.";
      case 'critical':
        return "Critical security issues detected that require immediate action.";
      default:
        return "Performing security assessment...";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Hardening Dashboard
              {getStatusBadge()}
            </span>
            <Button
              onClick={runSecurityAudit}
              disabled={isRunningAudit}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRunningAudit ? 'animate-spin' : ''}`} />
              Run Security Audit
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityStatus === 'critical' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Critical Security Alert</AlertTitle>
              <AlertDescription>
                Immediate action required. Some API keys pose security risks and need rotation or deactivation.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{apiKeyCount}</div>
                    <p className="text-xs text-muted-foreground">API Keys Managed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">100%</div>
                    <p className="text-xs text-muted-foreground">Encryption Coverage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className={`h-5 w-5 ${securityStatus === 'secure' ? 'text-green-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="text-2xl font-bold">{securityStatus === 'secure' ? 'OK' : 'ALERT'}</div>
                    <p className="text-xs text-muted-foreground">Security Status</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            {getStatusDescription()}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="alerts">Rotation Alerts</TabsTrigger>
          <TabsTrigger value="monitor">API Key Monitor</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts">
          <ApiKeyAlertMonitor restaurantId={restaurantId} />
        </TabsContent>
        
        <TabsContent value="monitor">
          <ApiKeySecurityMonitor restaurantId={restaurantId} />
        </TabsContent>
        
        <TabsContent value="audit">
          <ApiKeyRotationAudit restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityHardeningDashboard;
