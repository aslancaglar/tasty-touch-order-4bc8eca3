
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RotateCcw, Eye, EyeOff, Clock, User } from "lucide-react";
import { secureApiKeyService, type ApiKeyRotationLog } from "@/services/secure-api-keys";
import { useToast } from "@/hooks/use-toast";
import { logSecurityEvent } from "@/config/security";

interface ApiKeyRotationAuditProps {
  restaurantId: string;
}

const ApiKeyRotationAudit = ({ restaurantId }: ApiKeyRotationAuditProps) => {
  const [auditLogs, setAuditLogs] = useState<ApiKeyRotationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isForceRotating, setIsForceRotating] = useState(false);
  
  const { toast } = useToast();

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      const logs = await secureApiKeyService.getRotationAuditLog(restaurantId);
      setAuditLogs(logs);
    } catch (error) {
      console.error("Error loading audit logs:", error);
      logSecurityEvent('Failed to load rotation audit logs', { 
        restaurantId, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Error",
        description: "Failed to load rotation audit logs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forceRotateOverdueKeys = async () => {
    try {
      setIsForceRotating(true);
      const results = await secureApiKeyService.forceRotateOverdueKeys();
      
      const deactivated = results.filter(r => r.status === 'DEACTIVATED').length;
      const rotationRequired = results.filter(r => r.status === 'ROTATION_REQUIRED').length;
      
      logSecurityEvent('Force rotation check completed', { 
        deactivated, 
        rotationRequired, 
        results 
      });
      
      toast({
        title: "Rotation Check Complete",
        description: `${deactivated} keys deactivated, ${rotationRequired} require rotation`,
        variant: deactivated > 0 ? "destructive" : "default"
      });
      
      await loadAuditLogs();
    } catch (error) {
      console.error("Error forcing rotation:", error);
      logSecurityEvent('Force rotation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Force Rotation Failed",
        description: "Failed to check and rotate overdue keys",
        variant: "destructive"
      });
    } finally {
      setIsForceRotating(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [restaurantId]);

  const getRotationTypeBadge = (type: string) => {
    const variants = {
      manual: "default",
      automatic: "secondary",
      forced: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getRotationReasonBadge = (reason: string | null) => {
    if (!reason) return null;
    
    const variants = {
      scheduled: "secondary",
      security_breach: "destructive",
      admin_forced: "destructive",
      overdue_rotation: "destructive",
      automatic_deactivation: "destructive"
    } as const;
    
    return (
      <Badge variant={variants[reason as keyof typeof variants] || "outline"} className="ml-2">
        {reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            API Key Rotation Audit Log
            <Badge variant="outline" className="text-xs">
              {auditLogs.length} Records
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
              onClick={forceRotateOverdueKeys}
              disabled={isForceRotating}
              className="text-destructive hover:text-destructive"
            >
              <RotateCcw className={`h-4 w-4 ${isForceRotating ? 'animate-spin' : ''}`} />
              Force Check
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="text-center py-6 border rounded-md">
            <p className="text-muted-foreground">No rotation events recorded</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{log.service_name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{log.key_name}</span>
                      {getRotationTypeBadge(log.rotation_type)}
                      {getRotationReasonBadge(log.rotation_reason)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                      {log.rotated_by && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User Action
                        </div>
                      )}
                    </div>
                    
                    {showDetails && log.old_key_hash && (
                      <div className="mt-2 p-2 bg-background rounded text-xs">
                        <span className="text-muted-foreground">Old Key Hash: </span>
                        <span className="font-mono">{log.old_key_hash.substring(0, 16)}...</span>
                      </div>
                    )}
                  </div>
                  
                  {log.rotation_type === 'forced' && (
                    <AlertTriangle className="h-4 w-4 text-destructive mt-1" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="font-medium">Security Notice:</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            API keys are automatically deactivated after being overdue for rotation by 2x their interval period. 
            Force Check will identify and deactivate severely overdue keys for security compliance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeyRotationAudit;
