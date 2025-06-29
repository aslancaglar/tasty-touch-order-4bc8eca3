
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Shield, Download, Trash2 } from 'lucide-react';

interface SecurityEvent {
  id: string;
  event: string;
  timestamp: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

const SecurityEventLogger = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    // Load events from localStorage
    const storedEvents = localStorage.getItem('security-events');
    if (storedEvents) {
      try {
        setEvents(JSON.parse(storedEvents));
      } catch (error) {
        console.error('Failed to parse stored security events:', error);
      }
    }

    // Listen for new security events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'security-events' && e.newValue) {
        try {
          setEvents(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Failed to parse new security events:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getSeverityBadge = (severity: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'default'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-events-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const clearEvents = () => {
    setEvents([]);
    localStorage.removeItem('security-events');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Event Log
            </CardTitle>
            <CardDescription>
              Monitor security events and potential threats
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportEvents}
              disabled={events.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearEvents}
              disabled={events.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No security events recorded</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {events
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getSeverityIcon(event.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{event.event}</span>
                        {getSeverityBadge(event.severity)}
                      </div>
                      <p className="text-xs text-gray-500 mb-2">
                        {formatTimestamp(event.timestamp)}
                      </p>
                      {Object.keys(event.details).length > 0 && (
                        <div className="text-xs text-gray-600">
                          <details className="cursor-pointer">
                            <summary className="hover:text-gray-800">Details</summary>
                            <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityEventLogger;
