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
  private async checkUserPermissions(restaurantId: string): Promise<{ isOwner: boolean; isAdmin: boolean }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { isOwner: false, isAdmin: false };
      }

      // Check if user is admin first - admins have access to everything
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      const isAdmin = profileData?.is_admin || false;
      
      // If user is admin, they automatically have access
      if (isAdmin) {
        console.log(`User is admin - granting full access`);
        return { isOwner: true, isAdmin: true }; // Set isOwner to true for admins
      }

      // Check if user is restaurant owner only if not admin
      const { data: ownerData } = await supabase
        .from('restaurant_owners')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', user.id)
        .single();

      const isOwner = !!ownerData;

      console.log(`User permissions - Admin: ${isAdmin}, Owner: ${isOwner}`);
      return { isOwner, isAdmin };
    } catch (error) {
      console.error("Error checking user permissions:", error);
      return { isOwner: false, isAdmin: false };
    }
  }

  private async callApiKeyManager(action: string, payload: any) {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('User not authenticated');
    }

    // Check permissions before making the call
    const { isOwner, isAdmin } = await this.checkUserPermissions(payload.restaurantId);
    
    // Admin users have full access, regular users need to be restaurant owners
    if (!isAdmin && !isOwner) {
      throw new Error('Insufficient permissions - must be restaurant owner or admin');
    }

    console.log(`Making API key manager call - Admin: ${isAdmin}, Owner: ${isOwner}, Action: ${action}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/api-key-manager`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action, 
        ...payload,
        adminAccess: isAdmin,
        ownerAccess: isOwner || isAdmin // Admin users are treated as owners
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
