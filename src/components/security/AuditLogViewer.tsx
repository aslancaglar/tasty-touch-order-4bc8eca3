import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { Shield, Eye, Filter, Download } from 'lucide-react';

interface AuditLog {
  id: string;
  event_type: string;
  user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  action: string | null;
  details: any;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

const AuditLogViewer = () => {
  const { validateAdminOperation } = useSessionValidation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');

  useEffect(() => {
    const checkAccess = async () => {
      const adminValid = await validateAdminOperation();
      setIsAdmin(adminValid);
      if (adminValid) {
        await loadAuditLogs();
      }
      setLoading(false);
    };
    checkAccess();
  }, [validateAdminOperation]);

  const loadAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedSeverity !== 'all') {
        query = query.eq('severity', selectedSeverity);
      }

      if (selectedEventType !== 'all') {
        query = query.eq('event_type', selectedEventType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading audit logs:', error);
        return;
      }

      // Transform the data to match our AuditLog interface
      const transformedLogs: AuditLog[] = (data || []).map(log => ({
        id: log.id,
        event_type: log.event_type,
        user_id: log.user_id,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        action: log.action,
        details: log.details,
        severity: log.severity,
        ip_address: log.ip_address as string | null,
        user_agent: log.user_agent,
        session_id: log.session_id,
        created_at: log.created_at,
      }));

      setLogs(transformedLogs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAuditLogs();
    }
  }, [selectedSeverity, selectedEventType, isAdmin]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Action', 'Severity', 'User ID', 'Resource', 'Details'],
      ...logs.map(log => [
        formatTimestamp(log.created_at),
        log.event_type,
        log.action || '',
        log.severity,
        log.user_id || '',
        `${log.resource_type || ''}:${log.resource_id || ''}`,
        JSON.stringify(log.details || {})
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading audit logs...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Administrative privileges required to view audit logs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Audit Log Viewer</h2>
        </div>
        <Button onClick={exportLogs} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <select
          value={selectedEventType}
          onChange={(e) => setSelectedEventType(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">All Event Types</option>
          <option value="security_event">Security Events</option>
          <option value="admin_action">Admin Actions</option>
          <option value="database_operation">Database Operations</option>
          <option value="authentication">Authentication</option>
          <option value="page_view">Page Views</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
          <CardDescription>
            Showing {logs.length} most recent audit log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(log.severity)}>
                      {log.severity.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{log.event_type}</span>
                    {log.action && (
                      <span className="text-sm text-muted-foreground">
                        → {log.action}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>

                {(log.resource_type || log.resource_id) && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Resource: {log.resource_type}{log.resource_id && `:${log.resource_id}`}
                  </div>
                )}

                {log.user_id && (
                  <div className="text-sm text-muted-foreground mb-2">
                    User: {log.user_id}
                  </div>
                )}

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="text-sm">
                    <strong>Details:</strong>
                    <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}

                {(log.ip_address || log.user_agent) && (
                  <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                    {log.ip_address && <div>IP: {log.ip_address}</div>}
                    {log.user_agent && <div>User Agent: {log.user_agent}</div>}
                    {log.session_id && <div>Session: {log.session_id}</div>}
                  </div>
                )}
              </div>
            ))}

            {logs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found for the selected filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogViewer;
