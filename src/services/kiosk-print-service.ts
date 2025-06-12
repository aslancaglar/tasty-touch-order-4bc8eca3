
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/config/supabase";

export interface KioskPrintRequest {
  restaurantId: string;
  orderNumber: string;
  receiptContent: string;
  printerIds?: string[];
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
}

class KioskPrintService {
  async printReceipt(request: KioskPrintRequest): Promise<KioskPrintResult> {
    console.log('[KioskPrintService] Printing receipt for order:', request.orderNumber);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/kiosk-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
        },
        body: JSON.stringify(request),
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
      throw error;
    }
  }
}

export const kioskPrintService = new KioskPrintService();
