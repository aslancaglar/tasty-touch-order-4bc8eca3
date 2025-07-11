export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  description?: string | null;
  source_ip?: string | null;
  user_id?: string | null;
  restaurant_id?: string | null;
  metadata: any;
  resolved: boolean;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id?: string | null;
  old_values?: any;
  new_values?: any;
  user_id?: string | null;
  restaurant_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  resolvedEvents: number;
  eventsToday: number;
  eventsTrend: 'up' | 'down' | 'stable';
}