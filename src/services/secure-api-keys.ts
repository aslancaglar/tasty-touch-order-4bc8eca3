
import { supabase } from "@/integrations/supabase/client";

export type ServiceName = 'printnode' | 'stripe' | 'openai' | 'sendgrid';

interface ApiKeyServiceInterface {
  storeApiKey: (restaurantId: string, serviceName: ServiceName, apiKey: string, keyName?: string) => Promise<boolean>;
  retrieveApiKey: (restaurantId: string, serviceName: ServiceName, keyName?: string) => Promise<string | null>;
  deleteApiKey: (restaurantId: string, serviceName: ServiceName, keyName?: string) => Promise<boolean>;
  rotateApiKey: (restaurantId: string, serviceName: ServiceName, newApiKey: string, keyName?: string) => Promise<boolean>;
  listApiKeys: (restaurantId: string) => Promise<Array<{serviceName: string, keyName: string, createdAt: string}>>;
}

class SecureApiKeyService implements ApiKeyServiceInterface {
  private readonly EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/api-key-manager`;

  private async makeSecureRequest(action: string, data: any): Promise<any> {
    try {
      console.log(`[SecureApiKeyService] Making ${action} request:`, { ...data, apiKey: data.apiKey ? '[REDACTED]' : undefined });
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error("[SecureApiKeyService] No valid session found");
        throw new Error("Authentication required");
      }

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SecureApiKeyService] HTTP ${response.status}:`, errorText);
        
        if (response.status === 401) {
          throw new Error("Authentication failed");
        } else if (response.status === 403) {
          throw new Error("Permission denied");
        } else if (response.status >= 500) {
          throw new Error("Server error occurred");
        } else {
          throw new Error(`Request failed: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log(`[SecureApiKeyService] ${action} request successful`);
      return result;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] ${action} request failed:`, error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error("Network error - please check your connection");
      }
      
      throw error;
    }
  }

  async storeApiKey(restaurantId: string, serviceName: ServiceName, apiKey: string, keyName: string = 'primary'): Promise<boolean> {
    try {
      console.log(`[SecureApiKeyService] Storing API key for restaurant ${restaurantId}, service ${serviceName}`);
      
      if (!restaurantId || !serviceName || !apiKey) {
        console.error("[SecureApiKeyService] Missing required parameters for storing API key");
        throw new Error("Missing required parameters");
      }

      if (apiKey.length < 10) {
        console.error("[SecureApiKeyService] API key appears to be too short");
        throw new Error("Invalid API key format");
      }

      await this.makeSecureRequest('store', {
        restaurantId,
        serviceName,
        apiKey,
        keyName
      });

      console.log(`[SecureApiKeyService] API key stored successfully for ${serviceName}`);
      return true;
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to store API key for ${serviceName}:`, error);
      return false;
    }
  }

  async retrieveApiKey(restaurantId: string, serviceName: ServiceName, keyName: string = 'primary'): Promise<string | null> {
    try {
      console.log(`[SecureApiKeyService] Retrieving API key for restaurant ${restaurantId}, service ${serviceName}`);
      
      if (!restaurantId || !serviceName) {
        console.error("[SecureApiKeyService] Missing required parameters for retrieving API key");
        return null;
      }

      const result = await this.makeSecureRequest('retrieve', {
        restaurantId,
        serviceName,
        keyName
      });

      if (result?.apiKey) {
        console.log(`[SecureApiKeyService] API key retrieved successfully for ${serviceName}`);
        return result.apiKey;
      } else {
        console.log(`[SecureApiKeyService] No API key found for ${serviceName}`);
        return null;
      }
      
    } catch (error) {
      console.error(`[SecureApiKeyService] Failed to retrieve API key for ${serviceName}:`, error);
      
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

  // Health check method for debugging
  async healthCheck(): Promise<boolean> {
    try {
      console.log("[SecureApiKeyService] Performing health check");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.error("[SecureApiKeyService] Health check failed - no session");
        return false;
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
      console.log(`[SecureApiKeyService] Health check result: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
      
    } catch (error) {
      console.error("[SecureApiKeyService] Health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const secureApiKeyService = new SecureApiKeyService();

// Export additional utilities for debugging
export const debugApiKeyService = {
  async testConnection(): Promise<void> {
    console.log("[Debug] Testing SecureApiKeyService connection...");
    const isHealthy = await secureApiKeyService.healthCheck();
    console.log(`[Debug] Service health: ${isHealthy ? 'OK' : 'FAILED'}`);
  },
  
  async testRetrieveKey(restaurantId: string, serviceName: ServiceName): Promise<void> {
    console.log(`[Debug] Testing API key retrieval for ${serviceName}...`);
    const key = await secureApiKeyService.retrieveApiKey(restaurantId, serviceName);
    console.log(`[Debug] Key retrieval result: ${key ? 'SUCCESS (key found)' : 'FAILED (no key)'}`);
  }
};
