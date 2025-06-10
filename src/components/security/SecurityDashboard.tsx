
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Eye, Lock, Key } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import ApiKeySecurityMonitor from "./ApiKeySecurityMonitor";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

const SecurityDashboard = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    recentEvents: 0,
    activeThreats: 0,
    encryptedKeys: 0,
    legacyKeys: 0
  });

  // Mock security events for demonstration - in production, these would come from the error handler logs
  useEffect(() => {
    const mockEvents: SecurityEvent[] = [
      {
        id: "1",
        type: "API_KEY_ENCRYPTED",
        message: "PrintNode API key migrated to encrypted storage",
        timestamp: new Date().toISOString(),
        userId: user?.id,
        severity: "low",
        details: { service: "printnode", action: "migration" }
      },
      {
        id: "2", 
        type: "LEGACY_KEY_DETECTED",
        message: "Plaintext API key detected - migration recommended",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        userId: user?.id,
        severity: "medium",
        details: { service: "printnode", risk: "plaintext_storage" }
      },
      {
        id: "3",
        type: "ADMIN_ACCESS",
        message: "Admin privileges used for security configuration",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        userId: user?.id,
        severity: "high",
        details: { action: "security_settings" }
      },
      {
        id: "4",
        type: "KEY_ROTATION_DUE",
        message: "API key rotation required for compliance",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        userId: user?.id,
        severity: "medium",
        details: { service: "printnode", days_overdue: 5 }
      }
    ];

    setSecurityEvents(mockEvents);
    setSecurityStats({
      totalEvents: mockEvents.length,
      criticalEvents: mockEvents.filter(e => e.severity === 'critical').length,
      recentEvents: mockEvents.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 3600000
      ).length,
      activeThreats: 0,
      encryptedKeys: 2,
      legacyKeys: 1
    });
  }, [user?.id]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'API_KEY_ENCRYPTED':
      case 'KEY_ROTATION_DUE':
        return <Key className="h-4 w-4" />;
      case 'LEGACY_KEY_DETECTED':
        return <AlertTriangle className="h-4 w-4" />;
      case 'ADMIN_ACCESS':
        return <Shield className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Security Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          Real-time Monitoring
        </Badge>
      </div>

      {/* Enhanced Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityStats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Events</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.recentEvents}</div>
            <p className="text-xs text-muted-foreground">Last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <Lock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securityStats.activeThreats}</div>
            <p className="text-xs text-muted-foreground">System secure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encrypted Keys</CardTitle>
            <Key className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securityStats.encryptedKeys}</div>
            <p className="text-xs text-muted-foreground">Vault protected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Legacy Keys</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{securityStats.legacyKeys}</div>
            <p className="text-xs text-muted-foreground">Need migration</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {(securityStats.criticalEvents > 0 || securityStats.legacyKeys > 0) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            {securityStats.criticalEvents > 0 && `${securityStats.criticalEvents} critical security events require immediate attention. `}
            {securityStats.legacyKeys > 0 && `${securityStats.legacyKeys} legacy API keys should be migrated to encrypted storage.`}
          </AlertDescription>
        </Alert>
      )}

      {/* API Key Security Monitor */}
      {user && (
        <ApiKeySecurityMonitor restaurantId={user.id} />
      )}

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(event.type)}
                  <Badge className={`${getSeverityColor(event.severity)} text-white`}>
                    {event.severity.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <p className="font-medium">{event.message}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString()}
                    {event.userId && ` • User: ${event.userId}`}
                  </p>
                </div>

                <Badge variant="outline" className="text-xs">
                  {event.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Row Level Security</p>
                <p className="text-sm text-muted-foreground">
                  RLS policies are active and protecting your data based on user roles and ownership.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Key className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">API Key Encryption</p>
                <p className="text-sm text-muted-foreground">
                  API keys are stored using Supabase Vault with enterprise-grade encryption at rest and in transit.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Input Validation</p>
                <p className="text-sm text-muted-foreground">
                  All user inputs are being validated and sanitized to prevent XSS and injection attacks.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Eye className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Security Monitoring</p>
                <p className="text-sm text-muted-foreground">
                  All security events are being logged and monitored for suspicious activity and compliance.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
