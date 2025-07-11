-- Create security events table
CREATE TABLE public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  source_ip TEXT,
  user_id UUID,
  restaurant_id UUID,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  restaurant_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for security events
CREATE POLICY "Admins can manage all security events" 
ON public.security_events 
FOR ALL 
USING (get_current_user_admin_status())
WITH CHECK (get_current_user_admin_status());

CREATE POLICY "Restaurant owners can view their security events" 
ON public.security_events 
FOR SELECT 
USING (
  restaurant_id IS NULL OR 
  is_restaurant_owner(restaurant_id)
);

-- Create policies for audit logs
CREATE POLICY "Admins can view all audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (get_current_user_admin_status());

CREATE POLICY "Restaurant owners can view their audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  restaurant_id IS NULL OR 
  is_restaurant_owner(restaurant_id)
);

-- Create indexes for better performance
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at);
CREATE INDEX idx_security_events_restaurant_id ON public.security_events(restaurant_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type TEXT,
  _severity TEXT,
  _title TEXT,
  _description TEXT DEFAULT NULL,
  _source_ip TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL,
  _restaurant_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    title,
    description,
    source_ip,
    user_id,
    restaurant_id,
    metadata
  )
  VALUES (
    _event_type,
    _severity,
    _title,
    _description,
    _source_ip,
    _user_id,
    _restaurant_id,
    _metadata
  )
  RETURNING id INTO _event_id;
  
  RETURN _event_id;
END;
$$;