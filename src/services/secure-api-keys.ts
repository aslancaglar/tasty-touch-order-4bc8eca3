
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/config/supabase";

export type ServiceName = 'printnode' | 'stripe' | 'openai' | 'sendgrid';

// Add missing type definitions
export interface ApiKeyRecord {
  id: string;
  restaurant_id: string;
  service_name: string;
  key_name: string;
  encrypted_key_id: string;
  last_rotated: string;
  rotation_interval_days: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRotationAlert {
  restaurant_id: string;
  service_name: string;
  key_name: string;
  days_since_rotation: number;
  alert_level: 'OK' | 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface ApiKeyRotationLog {
  id: string;
  restaurant_id: string;
  service_name: string;
  key_name: string;
  rotation_type: string;
  rotation_reason: string | null;
  old_key_hash: string | null;
  rotated_by: string | null;
  created_at: string;
}

interface ApiKeyServiceInterface {
  storeApiKey: (restaurantId: string, serviceName: ServiceName, apiKey: string, keyName?: string) => Promise<boolean>;
  retrieveApiKey: (restaurantId: string, serviceName: ServiceName, keyName?: string) => Promise<string | null>;
  deleteApiKey: (restaurantId: string, serviceName: ServiceName, keyName?: string) => Promise<boolean>;
  rotateApiKey: (restaurantId: string, serviceName: ServiceName, newApiKey: string, keyName?: string) => Promise<boolean>;
  listApiKeys: (restaurantId: string) => Promise<Array<{serviceName: string, keyName: string, createdAt: string}>>;
}

class SecureApiKeyService implements ApiKeyServiceInterface {
  private readonly EDGE_FUNCTION_URL: string;

  constructor() {
    // Use dynamic URL from config instead of hardcoded
    this.EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/api-key-manager`;
  }

  private async makeSecureRequest(action: string, data: any): Promise<any> {
    try {
      console.log(`[SecureApiKeyService] Making ${action} request:`, { 
        ...data, 
        apiKey: data.apiKey ? '[REDACTED]' : undefined,
        restaurantId: data.restaurantId,
        serviceName: data.serviceName,
        keyName: data.keyName
      });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error("[SecureApiKeyService] No valid session found");
        throw new Error("Authentication required - please log in again");
      }

      console.log(`[SecureApiKeyService] Using edge function URL: ${this.EDGE_FUNCTION_URL}`);
      console.log(`[SecureApiKeyService] Session user ID: ${session.user?.id}`);

      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });

      console.log(`[SecureApiKeyService] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SecureApiKeyService] HTTP ${response.status}:`, errorText);
        
        if (response.status === 401) {
          throw new Error("Authentication failed - please log in again");
        } else if (response.status === 403) {
          throw new Error("Permission denied - insufficient access to this restaurant");
        } else if (response.status >= 500) {
          throw new Error(`Server error occurred: ${response.status}`);
        } else {
          throw new Error(`Request failed: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log(`[SecureApiKeyService] ${action} request successful:`, {
        hasResult: !!result,
        hasApiKey: !!(result?.apiKey),
        resultKeys: Object.keys(result || {})
      });
      return result;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] ${action} request failed:`, {
        errorMessage: error.message,
        errorType: error.constructor.name,
        restaurantId: data.restaurantId,
        serviceName: data.serviceName
      });
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Network error - please check your connection");
      }
      
      throw error;
    }
  }

  async storeApiKey(restaurantId: string, serviceName: ServiceName, apiKey: string, keyName: string = 'primary'): Promise<boolean> {
    try {
      console.log(`[SecureApiKeyService] Storing API key for restaurant ${restaurantId}, service ${serviceName}, keyName ${keyName}`);
      
      if (!restaurantId || !serviceName || !apiKey) {
        console.error("[SecureApiKeyService] Missing required parameters for storing API key");
        throw new Error("Missing required parameters: restaurantId, serviceName, or apiKey");
      }

      if (apiKey.length < 10) {
        console.error("[SecureApiKeyService] API key appears to be too short");
        throw new Error("Invalid API key format - key appears too short");
      }

      const result = await this.makeSecureRequest('store', {
        restaurantId,
        serviceName,
        apiKey,
        keyName
      });

      console.log(`[SecureApiKeyService] API key stored successfully for ${serviceName}:`, {
        success: !!result?.success,
        keyId: result?.keyId
      });
      return true;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to store API key for ${serviceName}:`, {
        errorMessage: error.message,
        restaurantId,
        serviceName,
        keyName
      });
      return false;
    }
  }

  async retrieveApiKey(restaurantId: string, serviceName: ServiceName, keyName: string = 'primary'): Promise<string | null> {
    try {
      console.log(`[SecureApiKeyService] Retrieving API key for restaurant ${restaurantId}, service ${serviceName}, keyName ${keyName}`);
      
      if (!restaurantId || !serviceName) {
        console.error("[SecureApiKeyService] Missing required parameters for retrieving API key");
        throw new Error("Missing required parameters: restaurantId or serviceName");
      }

      const result = await this.makeSecureRequest('retrieve', {
        restaurantId,
        serviceName,
        keyName
      });

      if (result?.apiKey) {
        console.log(`[SecureApiKeyService] API key retrieved successfully for ${serviceName}:`, {
          hasApiKey: true,
          keyLength: result.apiKey.length,
          keyPrefix: result.apiKey.substring(0, 8) + '...'
        });
        return result.apiKey;
      } else {
        console.log(`[SecureApiKeyService] No API key found for ${serviceName}:`, {
          restaurantId,
          serviceName,
          keyName,
          result
        });
        return null;
      }
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to retrieve API key for ${serviceName}:`, {
        errorMessage: error.message,
        restaurantId,
        serviceName,
        keyName
      });
      
      // Return null for retrieval failures to allow graceful degradation
      return null;
    }
  }

  async deleteApiKey(restaurantId: string, serviceName: ServiceName, keyName: string = 'primary'): Promise<boolean> {
    try {
      console.log(`[SecureApiKeyService] Deleting API key for restaurant ${restaurantId}, service ${serviceName}`);
      
      if (!restaurantId || !serviceName) {
        console.error("[SecureApiKeyService] Missing required parameters for deleting API key");
        return false;
      }

      await this.makeSecureRequest('delete', {
        restaurantId,
        serviceName,
        keyName
      });

      console.log(`[SecureApiKeyService] API key deleted successfully for ${serviceName}`);
      return true;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to delete API key for ${serviceName}:`, error);
      return false;
    }
  }

  async rotateApiKey(restaurantId: string, serviceName: ServiceName, newApiKey: string, keyName: string = 'primary'): Promise<boolean> {
    try {
      console.log(`[SecureApiKeyService] Rotating API key for restaurant ${restaurantId}, service ${serviceName}`);
      
      if (!restaurantId || !serviceName || !newApiKey) {
        console.error("[SecureApiKeyService] Missing required parameters for rotating API key");
        return false;
      }

      if (newApiKey.length < 10) {
        console.error("[SecureApiKeyService] New API key appears to be too short");
        throw new Error("Invalid new API key format");
      }

      await this.makeSecureRequest('rotate', {
        restaurantId,
        serviceName,
        apiKey: newApiKey,
        keyName
      });

      console.log(`[SecureApiKeyService] API key rotated successfully for ${serviceName}`);
      return true;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to rotate API key for ${serviceName}:`, error);
      return false;
    }
  }

  async listApiKeys(restaurantId: string): Promise<Array<{serviceName: string, keyName: string, createdAt: string}>> {
    try {
      console.log(`[SecureApiKeyService] Listing API keys for restaurant ${restaurantId}`);
      
      if (!restaurantId) {
        console.error("[SecureApiKeyService] Missing restaurant ID for listing API keys");
        return [];
      }

      const result = await this.makeSecureRequest('list', {
        restaurantId
      });

      if (result?.keys && Array.isArray(result.keys)) {
        console.log(`[SecureApiKeyService] Found ${result.keys.length} API keys`);
        return result.keys;
      } else {
        console.log("[SecureApiKeyService] No API keys found");
        return [];
      }
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to list API keys:`, error);
      return [];
    }
  }

  // Add missing methods for the security components
  async getApiKeyRecords(restaurantId: string): Promise<ApiKeyRecord[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_api_keys')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching API key records:', error);
      return [];
    }
  }

  async getKeysNeedingRotation(): Promise<ApiKeyRecord[]> {
    try {
      const { data, error } = await supabase
        .from('restaurant_api_keys')
        .select('*')
        .not('rotation_interval_days', 'is', null);

      if (error) throw error;
      
      // Filter keys that need rotation based on interval
      const now = new Date();
      return (data || []).filter(key => {
        if (!key.rotation_interval_days) return false;
        const lastRotated = new Date(key.last_rotated);
        const daysSinceRotation = Math.floor((now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24));
        return daysSinceRotation >= key.rotation_interval_days;
      });
    } catch (error) {
      console.error('Error fetching keys needing rotation:', error);
      return [];
    }
  }

  async getKeysNeedingRotationAlerts(restaurantId?: string): Promise<ApiKeyRotationAlert[]> {
    try {
      let query = supabase
        .from('restaurant_api_keys')
        .select('*')
        .not('rotation_interval_days', 'is', null);

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      return (data || []).map(key => {
        const lastRotated = new Date(key.last_rotated);
        const daysSinceRotation = Math.floor((now.getTime() - lastRotated.getTime()) / (1000 * 60 * 60 * 24));
        
        let alertLevel: ApiKeyRotationAlert['alert_level'] = 'OK';
        if (key.rotation_interval_days) {
          const threshold80 = key.rotation_interval_days * 0.8;
          const threshold100 = key.rotation_interval_days;
          const threshold200 = key.rotation_interval_days * 2;

          if (daysSinceRotation >= threshold200) {
            alertLevel = 'CRITICAL';
          } else if (daysSinceRotation >= threshold100) {
            alertLevel = 'WARNING';
          } else if (daysSinceRotation >= threshold80) {
            alertLevel = 'INFO';
          }
        }

        return {
          restaurant_id: key.restaurant_id,
          service_name: key.service_name,
          key_name: key.key_name,
          days_since_rotation: daysSinceRotation,
          alert_level: alertLevel
        };
      });
    } catch (error) {
      console.error('Error fetching rotation alerts:', error);
      return [];
    }
  }

  async getRotationAuditLog(restaurantId: string): Promise<ApiKeyRotationLog[]> {
    try {
      const { data, error } = await supabase
        .from('api_key_rotation_log')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rotation audit log:', error);
      return [];
    }
  }

  async forceRotateOverdueKeys(): Promise<Array<{serviceName: string, keyName: string, status: string}>> {
    try {
      // This would be implemented to force rotate overdue keys
      // For now, return empty array as placeholder
      console.log('[SecureApiKeyService] Force rotation check - placeholder implementation');
      return [];
    } catch (error) {
      console.error('Error in force rotation:', error);
      return [];
    }
  }

  async autoDeactivateOverdueKeys(): Promise<Array<{serviceName: string, keyName: string, status: string}>> {
    try {
      const overdueKeys = await this.getKeysNeedingRotationAlerts();
      const criticalKeys = overdueKeys.filter(key => key.alert_level === 'CRITICAL');
      
      // Deactivate critical keys
      const results = [];
      for (const key of criticalKeys) {
        try {
          const { error } = await supabase
            .from('restaurant_api_keys')
            .update({ is_active: false })
            .eq('restaurant_id', key.restaurant_id)
            .eq('service_name', key.service_name)
            .eq('key_name', key.key_name);

          if (!error) {
            results.push({
              serviceName: key.service_name,
              keyName: key.key_name,
              status: 'DEACTIVATED'
            });
          }
        } catch (error) {
          console.error(`Error deactivating key ${key.service_name}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in auto-deactivation:', error);
      return [];
    }
  }

  async migratePrintNodeKeys(): Promise<Array<{serviceName: string, success: boolean}>> {
    try {
      // Migrate legacy PrintNode keys from printer_settings table
      const { data: printerSettings, error } = await supabase
        .from('printer_settings')
        .select('*');

      if (error) throw error;

      const results = [];
      for (const setting of printerSettings || []) {
        if (setting.printnode_api_key && setting.restaurant_id) {
          try {
            const success = await this.storeApiKey(
              setting.restaurant_id,
              'printnode',
              setting.printnode_api_key,
              'primary'
            );
            results.push({ serviceName: 'printnode', success });
          } catch (error) {
            results.push({ serviceName: 'printnode', success: false });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error migrating PrintNode keys:', error);
      return [];
    }
  }

  // Enhanced health check method with better diagnostics
  async healthCheck(): Promise<{ isHealthy: boolean; details: any }> {
    try {
      console.log("[SecureApiKeyService] Performing comprehensive health check");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error("[SecureApiKeyService] Health check failed - no session");
        return { 
          isHealthy: false, 
          details: { 
            error: "No authentication session",
            edgeFunctionUrl: this.EDGE_FUNCTION_URL,
            timestamp: new Date().toISOString()
          }
        };
      }

      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'health'
        })
      });

      const isHealthy = response.ok;
      const responseText = await response.text();
      
      const details = {
        status: response.status,
        statusText: response.statusText,
        edgeFunctionUrl: this.EDGE_FUNCTION_URL,
        response: responseText,
        timestamp: new Date().toISOString()
      };

      console.log(`[SecureApiKeyService] Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`, details);
      return { isHealthy, details };
      
    } catch (error) {
      console.error("[SecureApiKeyService] Health check failed:", error);
      return { 
        isHealthy: false, 
        details: { 
          error: error.message,
          edgeFunctionUrl: this.EDGE_FUNCTION_URL,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Enhanced restaurant context validation
  async validateRestaurantContext(restaurantId: string): Promise<{ isValid: boolean; details: any }> {
    try {
      console.log(`[SecureApiKeyService] Validating restaurant context for: ${restaurantId}`);
      
      // Check if restaurant exists
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) {
        return {
          isValid: false,
          details: {
            error: 'Restaurant not found',
            restaurantId,
            dbError: restaurantError?.message
          }
        };
      }

      // Check user permissions
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return {
          isValid: false,
          details: {
            error: 'No authenticated user',
            restaurantId
          }
        };
      }

      // Check if user owns this restaurant or is admin
      const { data: ownership } = await supabase
        .from('restaurant_owners')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('user_id', session.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      const hasAccess = (ownership && ownership.length > 0) || profile?.is_admin;

      return {
        isValid: hasAccess,
        details: {
          restaurantId,
          restaurantName: restaurant.name,
          userId: session.user.id,
          hasOwnership: !!(ownership && ownership.length > 0),
          isAdmin: !!profile?.is_admin,
          hasAccess
        }
      };

    } catch (error) {
      console.error(`[SecureApiKeyService] Restaurant context validation failed:`, error);
      return {
        isValid: false,
        details: {
          error: error.message,
          restaurantId
        }
      };
    }
  }
}

// Export singleton instance
export const secureApiKeyService = new SecureApiKeyService();

// Enhanced debugging utilities
export const debugApiKeyService = {
  async testConnection(): Promise<void> {
    console.log("[Debug] Testing SecureApiKeyService connection...");
    const { isHealthy, details } = await secureApiKeyService.healthCheck();
    console.log(`[Debug] Service health: ${isHealthy ? 'OK' : 'FAILED'}`, details);
    if (!isHealthy) {
      throw new Error(`API Key Service health check failed: ${details.error || 'Unknown error'}`);
    }
  },
  
  async testRetrieveKey(restaurantId: string, serviceName: ServiceName): Promise<void> {
    console.log(`[Debug] Testing API key retrieval for ${serviceName}...`);
    
    // First validate restaurant context
    const contextValidation = await secureApiKeyService.validateRestaurantContext(restaurantId);
    console.log(`[Debug] Restaurant context validation:`, contextValidation);
    
    if (!contextValidation.isValid) {
      throw new Error(`Invalid restaurant context: ${contextValidation.details.error}`);
    }

    const key = await secureApiKeyService.retrieveApiKey(restaurantId, serviceName);
    console.log(`[Debug] Key retrieval result: ${key ? 'SUCCESS (key found)' : 'FAILED (no key)'}`);
    
    if (!key) {
      throw new Error(`No API key found for service ${serviceName} in restaurant ${restaurantId}`);
    }
  },

  async diagnoseEnvironment(): Promise<void> {
    console.log("[Debug] Environment diagnostics:");
    console.log("- Current URL:", window.location.href);
    console.log("- SUPABASE_URL:", SUPABASE_URL);
    console.log("- User Agent:", navigator.userAgent);
    
    const { data: { session } } = await supabase.auth.getSession();
    console.log("- Session exists:", !!session);
    console.log("- Session valid:", !!(session?.access_token));
    console.log("- User ID:", session?.user?.id);
    
    if (!session?.access_token) {
      throw new Error("No valid authentication session found");
    }
  },

  async debugRestaurantApiKeys(restaurantId: string): Promise<void> {
    console.log(`[Debug] Analyzing API keys for restaurant: ${restaurantId}`);
    
    try {
      // Check database records
      const { data: apiKeys, error } = await supabase
        .from('restaurant_api_keys')
        .select('*')
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error("[Debug] Database query error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`[Debug] Found ${apiKeys?.length || 0} API key records:`, apiKeys);

      // Check each service specifically
      const services: ServiceName[] = ['printnode', 'stripe', 'openai', 'sendgrid'];
      for (const service of services) {
        const serviceKeys = apiKeys?.filter(key => key.service_name === service);
        console.log(`[Debug] ${service} keys:`, serviceKeys);
        
        if (serviceKeys && serviceKeys.length > 0) {
          for (const keyRecord of serviceKeys) {
            console.log(`[Debug] Testing retrieval for ${service} key ${keyRecord.key_name}...`);
            try {
              const retrievedKey = await secureApiKeyService.retrieveApiKey(restaurantId, service, keyRecord.key_name);
              console.log(`[Debug] ${service} key retrieval: ${retrievedKey ? 'SUCCESS' : 'FAILED'}`);
            } catch (retrievalError) {
              console.error(`[Debug] ${service} key retrieval error:`, retrievalError);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Debug] API key analysis failed:", error);
      throw error;
    }
  }
};
