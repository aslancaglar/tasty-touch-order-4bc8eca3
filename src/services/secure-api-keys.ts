
import { supabase } from "@/integrations/supabase/client";

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

class SecureApiKeyService {
  private async callApiKeyManager(action: string, payload: any) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/api-key-manager`, {
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
    keyName: string = 'primary'
  ): Promise<boolean> {
    const result = await this.callApiKeyManager('rotate', {
      restaurantId,
      serviceName,
      keyName,
      apiKey: newApiKey
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
}

export const secureApiKeyService = new SecureApiKeyService();
