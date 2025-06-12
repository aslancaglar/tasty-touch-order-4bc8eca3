
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Printer, AlertCircle, Info } from "lucide-react";
import { CartItem } from "@/hooks/useCartManager";
import { Restaurant, OrderType } from "@/types/database-types";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { printReceipt } from "@/utils/print-utils";
import { printNodeService } from "@/services/printnode-service";
import { generateReceiptContent } from "@/utils/receipt-templates";
import OrderReceipt from "./OrderReceipt";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  orderNumber: string;
  cartItems: CartItem[];
  total: number;
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber?: string;
  uiLanguage?: SupportedLanguage;
  currency?: string;
}

interface PrintingState {
  isChecking: boolean;
  isConfigured: boolean;
  hasFallback: boolean;
  message: string;
  diagnostics?: any[];
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onNewOrder,
  orderNumber,
  cartItems,
  total,
  restaurant,
  orderType,
  tableNumber,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  const { t } = useTranslation(uiLanguage);
  const [printingState, setPrintingState] = useState<PrintingState>({
    isChecking: false,
    isConfigured: false,
    hasFallback: true, // Default to having browser fallback
    message: ''
  });

  // Enhanced configuration check with better error handling
  useEffect(() => {
    if (isOpen && restaurant?.id) {
      checkPrintingConfiguration();
    }
  }, [isOpen, restaurant?.id]);

  const checkPrintingConfiguration = async () => {
    if (!restaurant?.id) {
      console.warn("[OrderConfirmation] No restaurant ID available for printing check");
      setPrintingState({
        isChecking: false,
        isConfigured: false,
        hasFallback: true,
        message: 'Using browser printing as fallback'
      });
      return;
    }

    setPrintingState(prev => ({ ...prev, isChecking: true, message: 'Checking printing options...' }));

    try {
      console.log("[OrderConfirmation] Checking printing configuration for restaurant:", restaurant.id);
      
      // Use the new helper method for graceful checking
      const printingOptions = await printNodeService.getAvailablePrintingOptions(restaurant.id);
      
      setPrintingState({
        isChecking: false,
        isConfigured: printingOptions.printNodeAvailable,
        hasFallback: printingOptions.browserPrintingAvailable,
        message: printingOptions.message
      });

      console.log("[OrderConfirmation] Printing options checked:", printingOptions);

    } catch (error) {
      console.error("[OrderConfirmation] Error checking printing configuration:", error);
      
      // Graceful fallback - don't let printing errors block the order confirmation
      setPrintingState({
        isChecking: false,
        isConfigured: false,
        hasFallback: true,
        message: 'Using browser printing (configuration check failed)'
      });
    }
  };

  const handlePrintReceipt = async () => {
    if (!restaurant?.id) {
      console.error("[OrderConfirmation] Cannot print: No restaurant ID");
      return;
    }

    try {
      console.log("[OrderConfirmation] Starting print process...");
      
      // Try PrintNode first if configured
      if (printingState.isConfigured) {
        console.log("[OrderConfirmation] Attempting PrintNode printing...");
        
        try {
          const receiptContent = generateReceiptContent({
            orderNumber,
            cartItems,
            total,
            restaurant,
            orderType,
            tableNumber,
            uiLanguage,
            currency
          });

          const printResults = await printNodeService.sendPrintJob({
            restaurantId: restaurant.id,
            printerIds: [], // Will be fetched from config
            title: `Order ${orderNumber}`,
            content: receiptContent
          });

          const successfulPrints = printResults.filter(r => r.success);
          
          if (successfulPrints.length > 0) {
            console.log("[OrderConfirmation] PrintNode printing successful");
            return;
          } else {
            console.warn("[OrderConfirmation] PrintNode printing failed, falling back to browser");
          }
        } catch (printNodeError) {
          console.error("[OrderConfirmation] PrintNode error:", printNodeError);
          console.log("[OrderConfirmation] Falling back to browser printing");
        }
      }

      // Fallback to browser printing
      if (printingState.hasFallback) {
        console.log("[OrderConfirmation] Using browser printing");
        printReceipt('order-receipt');
      } else {
        console.error("[OrderConfirmation] No printing options available");
      }

    } catch (error) {
      console.error("[OrderConfirmation] Print error:", error);
      // Don't show error to user - printing is not critical for order confirmation
    }
  };

  const handleNewOrder = () => {
    onNewOrder();
    onClose();
  };

  const getPrintButtonText = () => {
    if (printingState.isChecking) return t("checkingPrinting");
    if (printingState.isConfigured) return t("printReceipt");
    if (printingState.hasFallback) return t("printReceipt");
    return t("printUnavailable");
  };

  const getPrintIcon = () => {
    if (printingState.isChecking) return <Info className="h-4 w-4 animate-spin" />;
    if (printingState.isConfigured) return <Printer className="h-4 w-4" />;
    if (printingState.hasFallback) return <Printer className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const canPrint = !printingState.isChecking && (printingState.isConfigured || printingState.hasFallback);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-green-600 text-2xl">
            <CheckCircle className="h-8 w-8" />
            {t("orderConfirmed")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold mb-2">{t("orderNumber")}</h2>
            <div className="bg-black text-white text-6xl font-mono py-4 px-6 rounded-lg inline-block">
              {orderNumber}
            </div>
          </div>

          {/* Print status message */}
          {printingState.message && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Info className="h-4 w-4" />
                {printingState.message}
              </div>
            </div>
          )}

          <div id="order-receipt">
            <OrderReceipt
              orderNumber={orderNumber}
              cartItems={cartItems}
              total={total}
              restaurant={restaurant}
              orderType={orderType}
              tableNumber={tableNumber}
              uiLanguage={uiLanguage}
              currency={currency}
            />
          </div>
        </div>

        <div className="flex-shrink-0 flex gap-3 pt-4 border-t">
          <Button
            onClick={handlePrintReceipt}
            disabled={!canPrint}
            variant="outline"
            className="flex-1"
          >
            {getPrintIcon()}
            {getPrintButtonText()}
          </Button>
          <Button onClick={handleNewOrder} className="flex-1">
            {t("newOrder")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;
