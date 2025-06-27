
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle } from 'lucide-react';

interface SecurityMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditLogSummary {
  total_events: number;
  security_events: number;
  admin_actions: number;
  database_operations: number;
  critical_events: number;
}

const SecurityMetrics = () => {
  const { user } = useAuth();
  const { validateAdminOperation } = useSessionValidation();
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditLogSummary | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const adminValid = await validateAdminOperation();
      setIsAdmin(adminValid);
      if (adminValid) {
        await loadSecurityMetrics();
      }
      setLoading(false);
    };
    checkAccess();
  }, [validateAdminOperation]);

  const loadSecurityMetrics = async () => {
    try {
      // Get audit log summary from last 24 hours
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('event_type, severity')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (auditError) {
        console.error('Error loading audit data:', auditError);
        return;
      }

      const summary: AuditLogSummary = {
        total_events: auditData?.length || 0,
        security_events: auditData?.filter(log => log.event_type === 'security_event').length || 0,
        admin_actions: auditData?.filter(log => log.event_type === 'admin_action').length || 0,
        database_operations: auditData?.filter(log => log.event_type === 'database_operation').length || 0,
        critical_events: auditData?.filter(log => log.severity === 'critical').length || 0,
      };

      setAuditSummary(summary);

      // Get security violations
      const { data: violationsData, error: violationsError } = await supabase
        .from('security_violations')
        .select('severity, resolved')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (violationsError) {
        console.error('Error loading violations data:', violationsError);
        return;
      }

      const securityMetrics: SecurityMetric[] = [
        {
          name: 'Total Events',
          value: summary.total_events,
          change: 0, // Would calculate from previous period
          trend: 'stable',
          severity: summary.total_events > 1000 ? 'medium' : 'low'
        },
        {
          name: 'Security Events',
          value: summary.security_events,
          change: 0,
          trend: summary.security_events > 10 ? 'up' : 'stable',
          severity: summary.security_events > 10 ? 'high' : 'low'
        },
        {
          name: 'Critical Events',
          value: summary.critical_events,
          change: 0,
          trend: summary.critical_events > 0 ? 'up' : 'stable',
          severity: summary.critical_events > 0 ? 'critical' : 'low'
        },
        {
          name: 'Violations',
          value: violationsData?.length || 0,
          change: 0,
          trend: (violationsData?.length || 0) > 5 ? 'up' : 'stable',
          severity: (violationsData?.length || 0) > 5 ? 'high' : 'low'
        }
      ];

      setMetrics(securityMetrics);
    } catch (error) {
      console.error('Error loading security metrics:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[severity as keyof typeof colors]}>{severity.toUpperCase()}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading security metrics...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Administrative privileges required to view security metrics.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Security Metrics (Last 24h)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              {getTrendIcon(metric.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center justify-between mt-2">
                {getSeverityBadge(metric.severity)}
                {metric.change !== 0 && (
                  <span className={`text-xs ${metric.change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {auditSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log Summary</CardTitle>
            <CardDescription>Breakdown of security events in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold">{auditSummary.security_events}</div>
                <div className="text-sm text-muted-foreground">Security Events</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{auditSummary.admin_actions}</div>
                <div className="text-sm text-muted-foreground">Admin Actions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold">{auditSummary.database_operations}</div>
                <div className="text-sm text-muted-foreground">DB Operations</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{auditSummary.critical_events}</div>
                <div className="text-sm text-muted-foreground">Critical Events</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {auditSummary?.critical_events > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {auditSummary.critical_events} critical security event(s) detected in the last 24 hours. 
            Please review the security dashboard for details.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SecurityMetrics;
