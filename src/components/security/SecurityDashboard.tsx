
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, Activity, Lock, Unlock, Ban } from 'lucide-react';
import { ipBlockingService } from '@/utils/ip-blocking-service';
import { enhancedAuditLogger } from './AuditLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface SecurityMetrics {
  totalViolations: number;
  blockedIPs: number;
  recentAlerts: SecurityAlert[];
  rateLimitViolations: number;
  authenticationFailures: number;
}

interface SecurityAlert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: Date;
  details: Record<string, any>;
}

const SecurityDashboard = () => {
  const { user } = useAuth();
  const { validateAdminOperation } = useSessionValidation();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalViolations: 0,
    blockedIPs: 0,
    recentAlerts: [],
    rateLimitViolations: 0,
    authenticationFailures: 0,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedIP, setSelectedIP] = useState<string>('');

  useEffect(() => {
    const checkAdminAccess = async () => {
      const adminValid = await validateAdminOperation();
      setIsAdmin(adminValid);
    };

    checkAdminAccess();
  }, [validateAdminOperation]);

  useEffect(() => {
    if (!isAdmin) return;

    // Simulate loading security metrics
    // In a real implementation, this would fetch from your security monitoring system
    const loadMetrics = () => {
      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'high',
          message: 'Multiple failed login attempts detected',
          timestamp: new Date(Date.now() - 30000),
          details: { ip: '192.168.1.100', attempts: 5 }
        },
        {
          id: '2',
          type: 'medium',
          message: 'Rate limit exceeded for form submissions',
          timestamp: new Date(Date.now() - 120000),
          details: { form_type: 'category', ip: '192.168.1.101' }
        },
        {
          id: '3',
          type: 'critical',
          message: 'SQL injection attempt blocked',
          timestamp: new Date(Date.now() - 300000),
          details: { ip: '192.168.1.102', pattern: 'union select' }
        }
      ];

      setMetrics({
        totalViolations: 15,
        blockedIPs: 3,
        recentAlerts: mockAlerts,
        rateLimitViolations: 8,
        authenticationFailures: 12,
      });
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleBlockIP = () => {
    if (!selectedIP || !isAdmin) return;

    ipBlockingService.blockIP(selectedIP, 24 * 60 * 60 * 1000, 'Manual block from dashboard');
    
    enhancedAuditLogger.logAdminOperation('manual_ip_block', {
      blocked_ip: selectedIP,
      admin_user: user?.id,
    }, user?.id || '');

    setSelectedIP('');
    // Refresh metrics would go here
  };

  const handleUnblockIP = () => {
    if (!selectedIP || !isAdmin) return;

    ipBlockingService.unblockIP(selectedIP, 'Manual unblock from dashboard');
    
    enhancedAuditLogger.logAdminOperation('manual_ip_unblock', {
      unblocked_ip: selectedIP,
      admin_user: user?.id,
    }, user?.id || '');

    setSelectedIP('');
    // Refresh metrics would go here
  };

  const getSeverityColor = (severity: SecurityAlert['type']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: SecurityAlert['type']) => {
    switch (severity) {
      case 'critical': return <Ban className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Shield className="h-4 w-4" />;
      case 'low': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You need administrative privileges to access the security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalViolations}</div>
            <p className="text-xs text-muted-foreground">Security violations detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
            <p className="text-xs text-muted-foreground">Currently blocked addresses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit Violations</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rateLimitViolations}</div>
            <p className="text-xs text-muted-foreground">Rate limit exceeded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auth Failures</CardTitle>
            <Lock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.authenticationFailures}</div>
            <p className="text-xs text-muted-foreground">Failed login attempts</p>
          </CardContent>
        </Card>
      </div>

      {/* IP Management */}
      <Card>
        <CardHeader>
          <CardTitle>IP Address Management</CardTitle>
          <CardDescription>Block or unblock IP addresses manually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Enter IP address"
              value={selectedIP}
              onChange={(e) => setSelectedIP(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <Button onClick={handleBlockIP} variant="destructive" size="sm">
              <Ban className="h-4 w-4 mr-2" />
              Block
            </Button>
            <Button onClick={handleUnblockIP} variant="outline" size="sm">
              <Unlock className="h-4 w-4 mr-2" />
              Unblock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Alerts</CardTitle>
          <CardDescription>Latest security events and violations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.recentAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className={`p-1 rounded-full text-white ${getSeverityColor(alert.type)}`}>
                  {getSeverityIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.type.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {alert.timestamp.toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium">{alert.message}</p>
                  <div className="text-sm text-muted-foreground mt-1">
                    {Object.entries(alert.details).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                          {String(value)}
                        </code>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
