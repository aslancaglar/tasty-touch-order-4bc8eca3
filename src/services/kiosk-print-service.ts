
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/config/supabase";

export interface KioskPrintRequest {
  restaurantId: string;
  orderNumber: string;
  receiptContent: string;
  printerIds?: string[];
  userToken?: string; // Add user token for authentication
}

export interface KioskPrintResult {
  success: boolean;
  results: Array<{
    printerId: string;
    success: boolean;
    jobId?: string;
    error?: string;
  }>;
  summary: {
    successful: number;
    failed: number;
    total: number;
  };
  message?: string;
}

class KioskPrintService {
  private async ensurePrintConfigExists(restaurantId: string): Promise<void> {
    console.log('[KioskPrintService] Ensuring print config exists for restaurant:', restaurantId);
    
    const { data: existingConfig, error: fetchError } = await supabase
      .from('restaurant_print_config')
      .select('id, configured_printers')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (fetchError) {
      console.error('[KioskPrintService] Error fetching print config:', fetchError);
      throw new Error('Failed to check print configuration');
    }

    if (!existingConfig) {
      console.log('[KioskPrintService] Creating default print config');
      const { error: insertError } = await supabase
        .from('restaurant_print_config')
        .insert({
          restaurant_id: restaurantId,
          configured_printers: [],
          browser_printing_enabled: true
        });

      if (insertError) {
        console.error('[KioskPrintService] Error creating print config:', insertError);
        throw new Error('Failed to create print configuration');
      }
    } else if (!existingConfig.configured_printers || !Array.isArray(existingConfig.configured_printers)) {
      console.log('[KioskPrintService] Fixing malformed configured_printers');
      const { error: updateError } = await supabase
        .from('restaurant_print_config')
        .update({ configured_printers: [] })
        .eq('restaurant_id', restaurantId);

      if (updateError) {
        console.error('[KioskPrintService] Error updating print config:', updateError);
        throw new Error('Failed to update print configuration');
      }
    }
  }

  private async getUserToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('[KioskPrintService] Error getting user token:', error);
      return null;
    }
  }

  async printReceipt(request: KioskPrintRequest): Promise<KioskPrintResult> {
    console.log('[KioskPrintService] Starting print request for order:', request.orderNumber);
    
    try {
      // Ensure print configuration exists
      await this.ensurePrintConfigExists(request.restaurantId);

      // Get user token for authentication
      const userToken = await this.getUserToken();
      
      const requestWithAuth = {
        ...request,
        userToken
      };

      console.log('[KioskPrintService] Calling kiosk-print function with auth token:', !!userToken);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/kiosk-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken || SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(requestWithAuth),
      });

      console.log(`[KioskPrintService] Response status: ${response.status}`);

      const responseText = await response.text();
      console.log(`[KioskPrintService] Response:`, responseText);

      if (!response.ok) {
        let errorMessage = 'Print service failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${responseText}`;
        }
        throw new Error(errorMessage);
      }

      const result = JSON.parse(responseText);
      console.log('[KioskPrintService] Print result:', result);
      
      return result;
    } catch (error) {
      console.error('[KioskPrintService] Print error:', error);
      
      // Return a structured error result instead of throwing
      return {
        success: false,
        results: [],
        summary: {
          successful: 0,
          failed: 0,
          total: 0
        },
        message: error instanceof Error ? error.message : 'Unknown print service error'
      };
    }
  }
}

export const kioskPrintService = new KioskPrintService();
