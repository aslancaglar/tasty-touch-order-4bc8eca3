import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, CheckCircle, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SecurityMetrics as SecurityMetricsType } from "@/types/security";

export function SecurityMetrics() {
  const [metrics, setMetrics] = useState<SecurityMetricsType>({
    totalEvents: 0,
    criticalEvents: 0,
    highEvents: 0,
    resolvedEvents: 0,
    eventsToday: 0,
    eventsTrend: 'stable'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Get all events
      const { data: allEvents, error: allEventsError } = await supabase
        .from('security_events')
        .select('severity, resolved, created_at');

      if (allEventsError) throw allEventsError;

      // Get today's events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayEvents, error: todayError } = await supabase
        .from('security_events')
        .select('id')
        .gte('created_at', today.toISOString());

      if (todayError) throw todayError;

      // Calculate metrics
      const totalEvents = allEvents?.length || 0;
      const criticalEvents = allEvents?.filter(e => e.severity === 'critical').length || 0;
      const highEvents = allEvents?.filter(e => e.severity === 'high').length || 0;
      const resolvedEvents = allEvents?.filter(e => e.resolved).length || 0;
      const eventsToday = todayEvents?.length || 0;

      setMetrics({
        totalEvents,
        criticalEvents,
        highEvents,
        resolvedEvents,
        eventsToday,
        eventsTrend: eventsToday > 5 ? 'up' : eventsToday > 2 ? 'stable' : 'down'
      });
    } catch (error) {
      console.error('Error fetching security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: "Total Events",
      value: metrics.totalEvents,
      icon: Shield,
      color: "text-blue-600"
    },
    {
      title: "Critical Events",
      value: metrics.criticalEvents,
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      title: "Resolved Events",
      value: metrics.resolvedEvents,
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      title: "Events Today",
      value: metrics.eventsToday,
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}