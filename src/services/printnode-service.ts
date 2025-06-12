
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
      
      if (!restaurantId) {
        console.error("[PrintNodeService] No restaurant ID provided");
        throw new Error("Restaurant ID is required");
      }

      // Enhanced API key retrieval with detailed logging
      console.log(`[PrintNodeService] Attempting to retrieve PrintNode API key...`);
      const apiKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
      
      console.log(`[PrintNodeService] API key retrieval result:`, {
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length,
        keyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'N/A'
      });

      if (!apiKey) {
        console.warn("[PrintNodeService] No API key found - PrintNode not configured");
        return {
          apiKey: '',
          printerIds: [],
          isConfigured: false
        };
      }

      // Get configured printers from database with enhanced error handling
      console.log(`[PrintNodeService] Retrieving printer configuration...`);
      const { data: printConfig, error: configError } = await import('@/integrations/supabase/client').then(module => 
        module.supabase
          .from('restaurant_print_config')
          .select('configured_printers')
          .eq('restaurant_id', restaurantId)
          .single()
      );

      if (configError && configError.code !== 'PGRST116') {
        console.error("[PrintNodeService] Database error retrieving print config:", configError);
        throw new Error(`Database error: ${configError.message}`);
      }

      const printerIds = Array.isArray(printConfig?.configured_printers) 
        ? printConfig.configured_printers.map(id => String(id))
        : [];

      console.log(`[PrintNodeService] Configuration loaded successfully:`, {
        hasApiKey: !!apiKey,
        printerCount: printerIds.length,
        printerIds: printerIds,
        isConfigured: !!apiKey && printerIds.length > 0
      });

      return {
        apiKey,
        printerIds,
        isConfigured: !!apiKey && printerIds.length > 0
      };
    } catch (error) {
      console.error("[PrintNodeService] Error getting configuration:", {
        errorMessage: error.message,
        errorType: error.constructor.name,
        restaurantId
      });
      
      // Re-throw with more context
      throw new Error(`PrintNode configuration error: ${error.message}`);
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log("[PrintNodeService] Validating API key with PrintNode servers...");
      
      if (!apiKey || apiKey.length < 10) {
        console.error("[PrintNodeService] Invalid API key format");
        return false;
      }
      
      const response = await Promise.race([
        fetch(`${this.API_BASE_URL}/whoami`, {
          headers: {
            'Authorization': `Basic ${btoa(apiKey + ':')}`
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API validation timeout')), 10000)
        )
      ]);

      const isValid = response.ok;
      console.log(`[PrintNodeService] API key validation result:`, {
        isValid,
        status: response.status,
        statusText: response.statusText
      });

      if (!isValid && response.status === 401) {
        console.error("[PrintNodeService] API key rejected by PrintNode - invalid credentials");
      }

      return isValid;
    } catch (error) {
      console.error("[PrintNodeService] API key validation failed:", {
        errorMessage: error.message,
        errorType: error.constructor.name
      });
      return false;
    }
  }

  async sendPrintJob(options: PrintJobOptions): Promise<PrintJobResult[]> {
    try {
      console.log(`[PrintNodeService] Sending print job: ${options.title} to ${options.printerIds.length} printer(s)`);
      
      const config = await this.getConfiguration(options.restaurantId);
      
      if (!config.isConfigured) {
        const errorMsg = !config.apiKey 
          ? "No PrintNode API key configured" 
          : "No printers configured";
        console.error(`[PrintNodeService] Configuration error: ${errorMsg}`);
        throw new Error(`PrintNode not configured: ${errorMsg}`);
      }

      // Validate API key before proceeding
      const isValidKey = await this.validateApiKey(config.apiKey);
      if (!isValidKey) {
        console.error("[PrintNodeService] API key validation failed before printing");
        throw new Error("Invalid or expired PrintNode API key");
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
            console.error(`[PrintNodeService] API error for printer ${printerId}:`, {
              status: response.status,
              statusText: response.statusText,
              errorText
            });
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
          console.error(`[PrintNodeService] Failed to send to printer ${printerId}:`, {
            errorMessage: printerError.message,
            errorType: printerError.constructor.name
          });
          results.push({
            success: false,
            printerId,
            error: printerError.message
          });
        }
      }
      
      console.log(`[PrintNodeService] Print job completed:`, {
        totalPrinters: options.printerIds.length,
        successfulPrints: results.filter(r => r.success).length,
        failedPrints: results.filter(r => !r.success).length
      });
      
      return results;
      
    } catch (error) {
      console.error("[PrintNodeService] Critical error in sendPrintJob:", {
        errorMessage: error.message,
        errorType: error.constructor.name,
        restaurantId: options.restaurantId
      });
      throw error;
    }
  }

  async testConnection(restaurantId: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log(`[PrintNodeService] Testing connection for restaurant: ${restaurantId}`);
      
      if (!restaurantId) {
        return {
          success: false,
          message: "No restaurant ID provided"
        };
      }

      // Enhanced configuration check with detailed diagnostics
      const config = await this.getConfiguration(restaurantId);
      
      console.log(`[PrintNodeService] Connection test - configuration check:`, {
        hasApiKey: !!config.apiKey,
        printerCount: config.printerIds.length,
        isConfigured: config.isConfigured
      });

      if (!config.apiKey) {
        return {
          success: false,
          message: "No PrintNode API key configured for this restaurant",
          details: {
            restaurantId,
            hasApiKey: false,
            printerCount: config.printerIds.length
          }
        };
      }

      // Validate API key with PrintNode
      console.log(`[PrintNodeService] Testing API key validity...`);
      const isValidKey = await this.validateApiKey(config.apiKey);
      
      if (!isValidKey) {
        return {
          success: false,
          message: "PrintNode API key is invalid or expired",
          details: {
            restaurantId,
            hasApiKey: true,
            apiKeyValid: false,
            printerCount: config.printerIds.length
          }
        };
      }

      if (config.printerIds.length === 0) {
        return {
          success: false,
          message: "PrintNode API key is valid but no printers are configured",
          details: {
            restaurantId,
            hasApiKey: true,
            apiKeyValid: true,
            printerCount: 0
          }
        };
      }

      return {
        success: true,
        message: `PrintNode configured successfully with ${config.printerIds.length} printer(s)`,
        details: {
          restaurantId,
          hasApiKey: true,
          apiKeyValid: true,
          printerCount: config.printerIds.length,
          printerIds: config.printerIds
        }
      };
      
    } catch (error) {
      console.error("[PrintNodeService] Connection test failed:", {
        errorMessage: error.message,
        errorType: error.constructor.name,
        restaurantId
      });
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        details: {
          restaurantId,
          error: error.message
        }
      };
    }
  }

  // Enhanced diagnostic method
  async diagnoseConfiguration(restaurantId: string): Promise<{ 
    success: boolean; 
    diagnostics: Array<{ test: string; passed: boolean; message: string; details?: any }> 
  }> {
    const diagnostics = [];
    let overallSuccess = true;

    try {
      // Test 1: Restaurant ID validation
      if (!restaurantId) {
        diagnostics.push({
          test: "Restaurant ID",
          passed: false,
          message: "No restaurant ID provided"
        });
        overallSuccess = false;
      } else {
        diagnostics.push({
          test: "Restaurant ID",
          passed: true,
          message: "Restaurant ID provided",
          details: { restaurantId }
        });
      }

      // Test 2: API Key retrieval
      try {
        const apiKey = await secureApiKeyService.retrieveApiKey(restaurantId, 'printnode');
        if (apiKey) {
          diagnostics.push({
            test: "API Key Retrieval",
            passed: true,
            message: "API key retrieved successfully",
            details: { keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 8) + '...' }
          });

          // Test 3: API Key validation
          const isValid = await this.validateApiKey(apiKey);
          diagnostics.push({
            test: "API Key Validation",
            passed: isValid,
            message: isValid ? "API key is valid" : "API key is invalid or expired"
          });
          if (!isValid) overallSuccess = false;

        } else {
          diagnostics.push({
            test: "API Key Retrieval",
            passed: false,
            message: "No API key found in secure storage"
          });
          overallSuccess = false;
        }
      } catch (error) {
        diagnostics.push({
          test: "API Key Retrieval",
          passed: false,
          message: `API key retrieval failed: ${error.message}`
        });
        overallSuccess = false;
      }

      // Test 4: Printer configuration
      try {
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

        diagnostics.push({
          test: "Printer Configuration",
          passed: printerIds.length > 0,
          message: printerIds.length > 0 
            ? `${printerIds.length} printer(s) configured` 
            : "No printers configured",
          details: { printerIds }
        });

        if (printerIds.length === 0) overallSuccess = false;

      } catch (error) {
        diagnostics.push({
          test: "Printer Configuration",
          passed: false,
          message: `Failed to check printer configuration: ${error.message}`
        });
        overallSuccess = false;
      }

      return { success: overallSuccess, diagnostics };

    } catch (error) {
      diagnostics.push({
        test: "Overall Diagnosis",
        passed: false,
        message: `Diagnosis failed: ${error.message}`
      });
      return { success: false, diagnostics };
    }
  }
}

export const printNodeService = new PrintNodeService();
