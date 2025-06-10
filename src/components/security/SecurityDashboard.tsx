
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Eye, Lock } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState({
    totalEvents: 0,
    criticalEvents: 0,
    recentEvents: 0,
    activeThreats: 0
  });

  // Mock security events for demonstration
  useEffect(() => {
    const mockEvents: SecurityEvent[] = [
      {
        id: "1",
        type: "AUTH_SUCCESS",
        message: "User successfully authenticated",
        timestamp: new Date().toISOString(),
        userId: "user-123",
        severity: "low",
        details: { method: "email" }
      },
      {
        id: "2", 
        type: "INVALID_SESSION",
        message: "Invalid session detected",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        userId: "user-456",
        severity: "medium",
        details: { reason: "expired" }
      },
      {
        id: "3",
        type: "ADMIN_ACCESS",
        message: "Admin privileges used",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        userId: "admin-789",
        severity: "high",
        details: { action: "user_management" }
      }
    ];

    setSecurityEvents(mockEvents);
    setSecurityStats({
      totalEvents: mockEvents.length,
      criticalEvents: mockEvents.filter(e => e.severity === 'critical').length,
      recentEvents: mockEvents.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 3600000
      ).length,
      activeThreats: 0
    });
  }, []);

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
      case 'AUTH_SUCCESS':
      case 'AUTH_FAILURE':
        return <Lock className="h-4 w-4" />;
      case 'ADMIN_ACCESS':
        return <Shield className="h-4 w-4" />;
      case 'INVALID_SESSION':
        return <AlertTriangle className="h-4 w-4" />;
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

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Security Alerts */}
      {securityStats.criticalEvents > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            There are {securityStats.criticalEvents} critical security events that require immediate attention.
          </AlertDescription>
        </Alert>
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

      {/* Security Recommendations */}
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
              <Lock className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Input Validation</p>
                <p className="text-sm text-muted-foreground">
                  All user inputs are being validated and sanitized to prevent XSS and injection attacks.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Eye className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Security Monitoring</p>
                <p className="text-sm text-muted-foreground">
                  All security events are being logged and monitored for suspicious activity.
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
