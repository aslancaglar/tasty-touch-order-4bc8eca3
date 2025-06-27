
import { supabase } from "@/integrations/supabase/client";

// Enhanced input validation utilities
export const validateInput = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  },
  
  password: (password: string): boolean => {
    return password.length >= 6 && password.length <= 128;
  },
  
  text: (text: string, maxLength: number = 1000): boolean => {
    if (!text || text.trim().length === 0) return false;
    if (text.length > maxLength) return false;
    
    // Basic XSS prevention
    const dangerous = /<script|javascript:|vbscript:|onload=|onerror=|union\s+select|drop\s+table|insert\s+into|delete\s+from/i;
    return !dangerous.test(text);
  },
  
  uuid: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
};

// Security logging utilities
export const logSecurityEvent = async (eventType: string, eventData: any = {}) => {
  try {
    await supabase.rpc('log_security_event', {
      event_type: eventType,
      event_data: eventData
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Rate limiting check
export const checkRateLimit = async (
  actionType: string, 
  maxAttempts: number = 5, 
  windowMinutes: number = 15
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id || null,
      p_action_type: actionType,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error to prevent lockout
    }

    return data === true;
  } catch (error) {
    console.error('Rate limit exception:', error);
    return true; // Allow on error to prevent lockout
  }
};

// Enhanced permission checks
export const checkPermissions = {
  isAdmin: async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('get_current_user_admin_status');
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Admin check failed:', error);
      return false;
    }
  },
  
  isRestaurantOwner: async (restaurantId: string): Promise<boolean> => {
    try {
      if (!validateInput.uuid(restaurantId)) return false;
      
      const { data, error } = await supabase.rpc('is_restaurant_owner', {
        restaurant_uuid: restaurantId
      });
      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Restaurant owner check failed:', error);
      return false;
    }
  }
};

// Sanitization utilities
export const sanitizeInput = {
  email: (email: string): string => {
    return email.trim().toLowerCase().slice(0, 255);
  },
  
  text: (text: string, maxLength: number = 1000): string => {
    return text.trim().slice(0, maxLength);
  },
  
  html: (html: string): string => {
    // Basic HTML sanitization - remove dangerous tags
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload=/gi, 'data-onload=')
      .replace(/onerror=/gi, 'data-onerror=');
  }
};

// Security headers for API requests
export const getSecurityHeaders = (): Record<string, string> => {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

// Session validation
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      await logSecurityEvent('invalid_session_access', {
        error: error?.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      await logSecurityEvent('expired_session_access', {
        expires_at: session.expires_at,
        current_time: now
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Session validation failed:', error);
    return false;
  }
};
