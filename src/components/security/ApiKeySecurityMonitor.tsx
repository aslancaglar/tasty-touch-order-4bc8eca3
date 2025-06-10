
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, RefreshCw, Clock, Eye, EyeOff } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { secureApiKeyService, type ApiKeyRecord } from "@/services/secure-api-keys";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent, checkRateLimit } from "@/config/security";

interface ApiKeySecurityMonitorProps {
  restaurantId: string;
}

const ApiKeySecurityMonitor = ({ restaurantId }: ApiKeySecurityMonitorProps) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [keysNeedingRotation, setKeysNeedingRotation] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const { toast } = useToast();

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      
      // Check rate limiting for API operations
      const rateLimitKey = `api-keys-${restaurantId}`;
      if (!checkRateLimit(rateLimitKey, 30)) { // 30 requests per minute for API operations
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many API key requests. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      const [keys, rotationNeeded] = await Promise.all([
        secureApiKeyService.getApiKeyRecords(restaurantId),
        secureApiKeyService.getKeysNeedingRotation()
      ]);
      
      setApiKeys(keys);
      setKeysNeedingRotation(rotationNeeded.filter(k => k.restaurant_id === restaurantId));
    } catch (error) {
      console.error("Error loading API keys:", error);
      logSecurityEvent('API key loading failed', { 
        restaurantId, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Security Error",
        description: "Failed to load API keys securely",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const migrateLegacyKeys = async () => {
    try {
      setIsMigrating(true);
      const results = await secureApiKeyService.migratePrintNodeKeys();
      
      const successful = results.filter((r: any) => r.success).length;
      const failed = results.filter((r: any) => !r.success).length;
      
      logSecurityEvent('Bulk API key migration completed', { 
        successful, 
        failed, 
        results 
      });
      
      toast({
        title: "Migration Complete",
        description: `${successful} keys migrated successfully, ${failed} failed`,
        variant: failed > 0 ? "destructive" : "default"
      });
      
      await loadApiKeys();
    } catch (error) {
      console.error("Error migrating keys:", error);
      logSecurityEvent('Bulk API key migration failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Migration Failed",
        description: "Failed to migrate legacy API keys",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, [restaurantId]);

  const getSecurityStatus = () => {
    if (apiKeys.length === 0) return 'none';
    return 'secure';
  };

  const getDaysUntilRotation = (lastRotated: string, intervalDays: number | null) => {
    if (!intervalDays) return null;
    const lastRotatedDate = new Date(lastRotated);
    const rotationDate = new Date(lastRotatedDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    const daysLeft = Math.ceil((rotationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysLeft;
  };

  const securityStatus = getSecurityStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            API Key Security Monitor
            <Badge 
              variant={securityStatus === 'secure' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {securityStatus === 'secure' && <Shield className="h-3 w-3 mr-1" />}
              {securityStatus === 'none' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {securityStatus === 'secure' ? 'Secure' : 'No Keys'}
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
              onClick={loadApiKeys}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {keysNeedingRotation.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rotation Required</AlertTitle>
            <AlertDescription>
              {keysNeedingRotation.length} API key(s) need rotation for security compliance.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{apiKeys.length}</div>
              <p className="text-xs text-muted-foreground">Active API Keys</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{keysNeedingRotation.length}</div>
              <p className="text-xs text-muted-foreground">Need Rotation</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {apiKeys.length > 0 ? '100%' : '0%'}
              </div>
              <p className="text-xs text-muted-foreground">Encrypted</p>
            </CardContent>
          </Card>
        </div>

        {showDetails && (
          <div className="space-y-3">
            <h4 className="font-medium">API Key Details</h4>
            {apiKeys.length > 0 ? (
              apiKeys.map((key) => {
                const daysUntilRotation = getDaysUntilRotation(key.last_rotated, key.rotation_interval_days);
                const needsRotation = keysNeedingRotation.some(k => 
                  k.restaurant_id === key.restaurant_id && 
                  k.service_name === key.service_name && 
                  k.key_name === key.key_name
                );
                
                return (
                  <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{key.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Key: {key.key_name} • Created: {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {daysUntilRotation !== null && (
                        <Badge variant={needsRotation ? "destructive" : daysUntilRotation < 7 ? "secondary" : "outline"}>
                          <Clock className="h-3 w-3 mr-1" />
                          {needsRotation ? 'Overdue' : `${daysUntilRotation}d`}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-green-700 bg-green-50">
                        Encrypted
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 border rounded-md">
                <p className="text-muted-foreground">No API keys configured</p>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Legacy Key Migration</h4>
              <p className="text-sm text-muted-foreground">
                Migrate any remaining plaintext API keys to encrypted storage
              </p>
            </div>
            <Button
              onClick={migrateLegacyKeys}
              disabled={isMigrating}
              variant="outline"
              size="sm"
            >
              {isMigrating ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Migrate All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeySecurityMonitor;
