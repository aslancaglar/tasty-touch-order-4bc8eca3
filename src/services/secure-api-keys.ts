
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/api-key-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API key operation failed');
    }

    return response.json();
  }

  async storeApiKey(
    restaurantId: string, 
    serviceName: string, 
    apiKey: string, 
    keyName: string = 'primary'
  ): Promise<string> {
    const result = await this.callApiKeyManager('store', {
      restaurantId,
      serviceName,
      keyName,
      apiKey
    });
    return result.keyId;
  }

  async retrieveApiKey(
    restaurantId: string, 
    serviceName: string, 
    keyName: string = 'primary'
  ): Promise<string | null> {
    const result = await this.callApiKeyManager('retrieve', {
      restaurantId,
      serviceName,
      keyName
    });
    return result.apiKey;
  }

  async rotateApiKey(
    restaurantId: string, 
    serviceName: string, 
    newApiKey: string, 
    keyName: string = 'primary',
    rotationReason: string = 'manual'
  ): Promise<boolean> {
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
    
    // Type cast the alerts to ensure they match our interface
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
