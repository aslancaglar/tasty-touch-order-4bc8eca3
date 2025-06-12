
import { secureApiKeyService } from "./secure-api-keys";

export interface PrintNodeConfig {
  apiKey: string;
  printerIds: string[];
  isConfigured: boolean;
}

export interface PrintJobOptions {
  printerIds: string[];
  title: string;
  content: string;
  restaurantId: string;
}

export interface PrintJobResult {
  success: boolean;
  printerId: string;
  jobId?: number;
  error?: string;
}

class PrintNodeService {
  private readonly API_BASE_URL = 'https://api.printnode.com';

  async getConfiguration(restaurantId: string): Promise<PrintNodeConfig> {
    try {
      console.log(`[PrintNodeService] Getting configuration for restaurant: ${restaurantId}`);
      
      const apiKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
      
      if (!apiKey) {
        console.log("[PrintNodeService] No API key found");
        return {
          apiKey: '',
          printerIds: [],
          isConfigured: false
        };
      }

      // Get configured printers from database
      const { data: printConfig } = await import('@/integrations/supabase/client').then(module => 
        module.supabase
          .from('restaurant_print_config')
          .select('configured_printers')
          .eq('restaurant_id', restaurantId)
          .single()
      );

      const printerIds = Array.isArray(printConfig?.configured_printers) 
        ? printConfig.configured_printers.map(id => String(id))
        : [];

      console.log(`[PrintNodeService] Configuration loaded - API key exists: ${!!apiKey}, Printers: ${printerIds.length}`);

      return {
        apiKey,
        printerIds,
        isConfigured: !!apiKey && printerIds.length > 0
      };
    } catch (error) {
      console.error("[PrintNodeService] Error getting configuration:", error);
      return {
        apiKey: '',
        printerIds: [],
        isConfigured: false
      };
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log("[PrintNodeService] Validating API key");
      
      const response = await fetch(`${this.API_BASE_URL}/whoami`, {
        headers: {
          'Authorization': `Basic ${btoa(apiKey + ':')}`
        }
      });

      const isValid = response.ok;
      console.log(`[PrintNodeService] API key validation: ${isValid ? 'VALID' : 'INVALID'}`);
      return isValid;
    } catch (error) {
      console.error("[PrintNodeService] API key validation failed:", error);
      return false;
    }
  }

  async sendPrintJob(options: PrintJobOptions): Promise<PrintJobResult[]> {
    try {
      console.log(`[PrintNodeService] Sending print job: ${options.title}`);
      
      const config = await this.getConfiguration(options.restaurantId);
      
      if (!config.isConfigured) {
        throw new Error("PrintNode not properly configured");
      }

      // Encode content for PrintNode
      const textEncoder = new TextEncoder();
      const encodedBytes = textEncoder.encode(options.content);
      const encodedContent = btoa(Array.from(encodedBytes).map(byte => String.fromCharCode(byte)).join(''));
      
      const results: PrintJobResult[] = [];
      
      for (const printerId of options.printerIds) {
        try {
          console.log(`[PrintNodeService] Sending to printer: ${printerId}`);
          
          const response = await Promise.race([
            fetch(`${this.API_BASE_URL}/printjobs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa(config.apiKey + ':')}`
              },
              body: JSON.stringify({
                printer: parseInt(printerId, 10) || printerId,
                title: options.title,
                contentType: "raw_base64",
                content: encodedContent,
                source: "Restaurant Kiosk"
              })
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('PrintNode request timeout')), 10000)
            )
          ]);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[PrintNodeService] API error for printer ${printerId}:`, response.status, errorText);
            results.push({
              success: false,
              printerId,
              error: `API error: ${response.status} - ${errorText}`
            });
            continue;
          }
          
          const result = await response.json();
          console.log(`[PrintNodeService] Print job sent successfully to printer ${printerId}:`, result);
          
          results.push({
            success: true,
            printerId,
            jobId: result.id || result[0]?.id
          });
          
        } catch (printerError) {
          console.error(`[PrintNodeService] Failed to send to printer ${printerId}:`, printerError);
          results.push({
            success: false,
            printerId,
            error: printerError.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error("[PrintNodeService] Critical error in sendPrintJob:", error);
      throw error;
    }
  }

  async testConnection(restaurantId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log(`[PrintNodeService] Testing connection for restaurant: ${restaurantId}`);
      
      const config = await this.getConfiguration(restaurantId);
      
      if (!config.apiKey) {
        return {
          success: false,
          message: "No PrintNode API key configured"
        };
      }

      const isValidKey = await this.validateApiKey(config.apiKey);
      
      if (!isValidKey) {
        return {
          success: false,
          message: "Invalid PrintNode API key"
        };
      }

      if (config.printerIds.length === 0) {
        return {
          success: false,
          message: "No printers configured"
        };
      }

      return {
        success: true,
        message: `PrintNode configured successfully with ${config.printerIds.length} printer(s)`,
        details: {
          printerCount: config.printerIds.length,
          printerIds: config.printerIds
        }
      };
      
    } catch (error) {
      console.error("[PrintNodeService] Connection test failed:", error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }
}

export const printNodeService = new PrintNodeService();
