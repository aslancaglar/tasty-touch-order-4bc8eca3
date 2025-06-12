
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

class SecureApiKeyService {
  private async callApiKeyManager(action: string, payload: any) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated - please log in');
    }

    console.log(`Making API key manager call - Action: ${action}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/api-key-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action, 
        ...payload
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API key manager response error: ${response.status} - ${errorText}`);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText || 'API key operation failed' };
      }
      
      // Provide better error messages for common authorization issues
      if (response.status === 403 || error.error?.includes('Insufficient permissions')) {
        throw new Error('Access denied: You need to be a restaurant owner or admin to manage API keys');
      }
      
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
    try {
      const result = await this.callApiKeyManager('store', {
        restaurantId,
        serviceName,
        keyName,
        apiKey
      });
      return result.keyId;
    } catch (error) {
      console.error('Store API key error:', error);
      throw error;
    }
  }

  async retrieveApiKey(
    restaurantId: string, 
    serviceName: string, 
    keyName: string = 'primary'
  ): Promise<string | null> {
    try {
      const result = await this.callApiKeyManager('retrieve', {
        restaurantId,
        serviceName,
        keyName
      });
      return result.apiKey;
    } catch (error) {
      console.error('Retrieve API key error:', error);
      throw error;
    }
  }

  async rotateApiKey(
    restaurantId: string, 
    serviceName: string, 
    newApiKey: string, 
    keyName: string = 'primary'
  ): Promise<boolean> {
    try {
      const result = await this.callApiKeyManager('rotate', {
        restaurantId,
        serviceName,
        keyName,
        apiKey: newApiKey
      });
      return result.success;
    } catch (error) {
      console.error('Rotate API key error:', error);
      throw error;
    }
  }

  async migratePrintNodeKeys(): Promise<any> {
    try {
      const result = await this.callApiKeyManager('migrate_printnode_keys', {});
      return result.results;
    } catch (error) {
      console.error('Migrate PrintNode keys error:', error);
      throw error;
    }
  }

  async getApiKeyRecords(restaurantId: string): Promise<ApiKeyRecord[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_api_keys')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('service_name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          // No records found
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Get API key records error:', error);
      throw error;
    }
  }

  async getKeysNeedingRotation(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_keys_needing_rotation');
      if (error) {
        if (error.code === 'PGRST116') {
          // No records found
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Get keys needing rotation error:', error);
      throw error;
    }
  }
}

export const secureApiKeyService = new SecureApiKeyService();
