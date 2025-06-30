
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, Eye, Users, Clock, RefreshCw } from 'lucide-react';
import { getCacheSecurityMetrics, forceInvalidateAllSessions } from '@/utils/auth-cache-utils';

interface SecurityEvent {
  id: string;
  type: 'authentication' | 'authorization' | 'cache' | 'session' | 'suspicious';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: number;
  userId?: string;
  resolved: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  activeThreats: number;
  cacheHealth: ReturnType<typeof getCacheSecurityMetrics>;
  sessionCount: number;
  lastIncident: number | null;
}

const SecurityDashboard = () => {
  const { isAdmin, user } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    activeThreats: 0,
    cacheHealth: getCacheSecurityMetrics(),
    sessionCount: 0,
    lastIncident: null
  });
  const [loading, setLoading] = useState(true);

  // Only show to admin users
  if (!isAdmin) {
    return null;
  }

  useEffect(() => {
    loadSecurityData();
    
    // Set up real-time monitoring
    const interval = setInterval(() => {
      updateMetrics();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load security events from localStorage (in production, this would come from a backend)
      const storedEvents = localStorage.getItem('security_events');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents) as SecurityEvent[];
        setEvents(parsedEvents.sort((a, b) => b.timestamp - a.timestamp));
      }
      
      updateMetrics();
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = () => {
    const cacheHealth = getCacheSecurityMetrics();
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = events.filter(e => e.timestamp > last24Hours);
    const criticalEvents = recentEvents.filter(e => e.severity === 'critical');
    const activeThreats = recentEvents.filter(e => !e.resolved && e.severity !== 'low');
    
    setMetrics({
      totalEvents: recentEvents.length,
      criticalEvents: criticalEvents.length,
      activeThreats: activeThreats.length,
      cacheHealth,
      sessionCount: cacheHealth.totalEntries,
      lastIncident: activeThreats.length > 0 ? Math.max(...activeThreats.map(e => e.timestamp)) : null
    });
  };

  const handleForceSessionInvalidation = () => {
    forceInvalidateAllSessions();
    addSecurityEvent({
      type: 'session',
      severity: 'medium',
      message: 'Administrator forced session invalidation for all users',
      details: { adminId: user?.id, action: 'force_invalidate_all' }
    });
  };

  const addSecurityEvent = (eventData: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>) => {
    const event: SecurityEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      resolved: false
    };
    
    const updatedEvents = [event, ...events].slice(0, 100); // Keep last 100 events
    setEvents(updatedEvents);
    
    // Store to localStorage (in production, send to backend)
    localStorage.setItem('security_events', JSON.stringify(updatedEvents));
    
    updateMetrics();
  };

  const resolveEvent = (eventId: string) => {
    const updatedEvents = events.map(e => 
      e.id === eventId ? { ...e, resolved: true } : e
    );
    setEvents(updatedEvents);
    localStorage.setItem('security_events', JSON.stringify(updatedEvents));
    updateMetrics();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage system security</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadSecurityData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleForceSessionInvalidation}
            variant="destructive"
            size="sm"
          >
            <Shield className="h-4 w-4 mr-2" />
            Force Session Reset
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.activeThreats}</div>
            <p className="text-xs text-gray-600">Unresolved security issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events (24h)</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-gray-600">
              {metrics.criticalEvents} critical events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sessionCount}</div>
            <p className="text-xs text-gray-600">
              {metrics.cacheHealth.validEntries} valid, {metrics.cacheHealth.invalidEntries} invalid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Incident</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.lastIncident 
                ? Math.round((Date.now() - metrics.lastIncident) / (1000 * 60)) + 'm'
                : 'None'
              }
            </div>
            <p className="text-xs text-gray-600">
              {metrics.lastIncident ? 'minutes ago' : 'No recent incidents'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {metrics.activeThreats > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Active Security Threats Detected</AlertTitle>
          <AlertDescription className="text-red-700">
            There are {metrics.activeThreats} unresolved security issues that require attention.
            Review the events below and take appropriate action.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Events */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No security events recorded</p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 20).map((event) => (
                    <div 
                      key={event.id}
                      className={`p-4 rounded-lg border ${event.resolved ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${getSeverityColor(event.severity)} text-white`}>
                              {event.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {event.type}
                            </Badge>
                            {event.resolved && (
                              <Badge variant="secondary">RESOLVED</Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{event.message}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatTimestamp(event.timestamp)}
                          </p>
                          {Object.keys(event.details).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-sm text-blue-600 cursor-pointer">
                                View Details
                              </summary>
                              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                        {!event.resolved && (
                          <Button
                            onClick={() => resolveEvent(event.id)}
                            size="sm"
                            variant="outline"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total Entries:</span>
                  <span className="font-medium">{metrics.cacheHealth.totalEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valid Entries:</span>
                  <span className="font-medium text-green-600">{metrics.cacheHealth.validEntries}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invalid Entries:</span>
                  <span className="font-medium text-red-600">{metrics.cacheHealth.invalidEntries}</span>
                </div>
                {metrics.cacheHealth.oldestEntry && (
                  <div className="flex justify-between">
                    <span>Oldest Entry:</span>
                    <span className="font-medium text-sm">
                      {formatTimestamp(metrics.cacheHealth.oldestEntry)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Total (24h):</span>
                  <span className="font-medium">{metrics.totalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical:</span>
                  <span className="font-medium text-red-600">{metrics.criticalEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Threats:</span>
                  <span className="font-medium text-orange-600">{metrics.activeThreats}</span>
                </div>
                <div className="flex justify-between">
                  <span>Resolution Rate:</span>
                  <span className="font-medium text-green-600">
                    {metrics.totalEvents > 0 
                      ? Math.round(((metrics.totalEvents - metrics.activeThreats) / metrics.totalEvents) * 100)
                      : 100
                    }%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;
