import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/config/supabase";

export interface ApiKeyRecord {
  id: string;
  restaurant_id: string;
  service_name: string;
  key_name: string;
  created_at: string;
  updated_at: string;
  last_rotated: string;
  is_active: boolean;
  rotation_interval_days: number | null;
}

export interface ApiKeyRotationLog {
  id: string;
  restaurant_id: string;
  service_name: string;
  key_name: string;
  rotation_type: string;
  old_key_hash: string | null;
  rotation_reason: string | null;
  rotated_by: string | null;
  created_at: string;
}

export interface ApiKeyRotationAlert {
  restaurant_id: string;
  service_name: string;
  key_name: string;
  days_since_rotation: number;
  alert_level: 'OK' | 'INFO' | 'WARNING' | 'CRITICAL';
}

class SecureApiKeyService {
  private async callApiKeyManager(action: string, payload: any) {
    console.log(`[SecureApiKeyService] Calling API key manager with action: ${action}`);
    console.log(`[SecureApiKeyService] Payload:`, payload);
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[SecureApiKeyService] Session error:', sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      console.error('[SecureApiKeyService] No session found');
      throw new Error('User not authenticated - please log in again');
    }

    console.log(`[SecureApiKeyService] Session found, user: ${session.user?.email}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/api-key-manager`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...payload }),
      });

      console.log(`[SecureApiKeyService] Response status: ${response.status}`);
      console.log(`[SecureApiKeyService] Response headers:`, Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log(`[SecureApiKeyService] Response text:`, responseText);

      if (!response.ok) {
        let errorMessage = 'API key operation failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
          console.error('[SecureApiKeyService] Parsed error:', errorData);
        } catch (parseError) {
          console.error('[SecureApiKeyService] Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      try {
        const result = JSON.parse(responseText);
        console.log(`[SecureApiKeyService] Parsed result:`, result);
        return result;
      } catch (parseError) {
        console.error('[SecureApiKeyService] Failed to parse success response:', parseError);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('[SecureApiKeyService] Network or fetch error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server');
      }
      throw error;
    }
  }

  async storeApiKey(
    restaurantId: string, 
    serviceName: string, 
    apiKey: string, 
    keyName: string = 'primary'
  ): Promise<string> {
    console.log(`[SecureApiKeyService] Storing API key for restaurant ${restaurantId}, service ${serviceName}`);
    
    if (!restaurantId || !serviceName || !apiKey) {
      throw new Error('Restaurant ID, service name, and API key are required');
    }

    const result = await this.callApiKeyManager('store', {
      restaurantId,
      serviceName,
      keyName,
      apiKey
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to store API key');
    }
    
    return result.keyId;
  }

  async retrieveApiKey(
    restaurantId: string, 
    serviceName: string, 
    keyName: string = 'primary'
  ): Promise<string | null> {
    console.log(`[SecureApiKeyService] Retrieving API key for restaurant ${restaurantId}, service ${serviceName}`);
    
    if (!restaurantId || !serviceName) {
      throw new Error('Restaurant ID and service name are required');
    }

    try {
      const result = await this.callApiKeyManager('retrieve', {
        restaurantId,
        serviceName,
        keyName
      });
      
      console.log(`[SecureApiKeyService] Retrieve result:`, result);
      return result.apiKey;
    } catch (error) {
      console.error(`[SecureApiKeyService] Error retrieving API key:`, error);
      // Return null instead of throwing error for non-existent keys
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async rotateApiKey(
    restaurantId: string, 
    serviceName: string, 
    newApiKey: string, 
    keyName: string = 'primary',
    rotationReason: string = 'manual'
  ): Promise<boolean> {
    console.log(`[SecureApiKeyService] Rotating API key for restaurant ${restaurantId}, service ${serviceName}`);
    
    if (!restaurantId || !serviceName || !newApiKey) {
      throw new Error('Restaurant ID, service name, and new API key are required');
    }

    const result = await this.callApiKeyManager('rotate_with_audit', {
      restaurantId,
      serviceName,
      keyName,
      apiKey: newApiKey,
      rotationReason
    });
    
    return result.success;
  }

  async migratePrintNodeKeys(): Promise<any> {
    console.log('[SecureApiKeyService] Attempting migration of PrintNode keys');
    
    const result = await this.callApiKeyManager('migrate_printnode_keys', {});
    return result.results;
  }

  async getApiKeyRecords(restaurantId: string): Promise<ApiKeyRecord[]> {
    const { data, error } = await supabase
      .from('restaurant_api_keys')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('service_name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getKeysNeedingRotation(): Promise<any[]> {
    const { data, error } = await supabase.rpc('get_keys_needing_rotation');
    if (error) throw error;
    return data || [];
  }

  async getKeysNeedingRotationAlerts(restaurantId?: string): Promise<ApiKeyRotationAlert[]> {
    const { data, error } = await supabase.rpc('get_keys_needing_rotation_alerts');
    if (error) throw error;
    
    let alerts = data || [];
    if (restaurantId) {
      alerts = alerts.filter((alert: any) => alert.restaurant_id === restaurantId);
    }
    
    return alerts.map((alert: any): ApiKeyRotationAlert => ({
      restaurant_id: alert.restaurant_id,
      service_name: alert.service_name,
      key_name: alert.key_name,
      days_since_rotation: alert.days_since_rotation,
      alert_level: alert.alert_level as 'OK' | 'INFO' | 'WARNING' | 'CRITICAL'
    }));
  }

  async getRotationAuditLog(restaurantId: string): Promise<ApiKeyRotationLog[]> {
    const { data, error } = await supabase
      .from('api_key_rotation_log')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  async forceRotateOverdueKeys(): Promise<any[]> {
    const { data, error } = await supabase.rpc('force_rotate_overdue_keys');
    if (error) throw error;
    return data || [];
  }

  async autoDeactivateOverdueKeys(): Promise<any[]> {
    const { data, error } = await supabase.rpc('auto_deactivate_overdue_keys');
    if (error) throw error;
    return data || [];
  }
}

export const secureApiKeyService = new SecureApiKeyService();
