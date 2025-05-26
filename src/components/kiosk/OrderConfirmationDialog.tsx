import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Clock, Receipt, Printer } from "lucide-react";
import { CartItem } from "@/types/database-types";
import { calculateCartTotals } from "@/utils/price-utils";
import { printReceipt } from "@/utils/print-utils";
import { generatePlainTextReceipt } from "@/utils/receipt-templates";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import OrderReceipt from "./OrderReceipt";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  orderNumber: string;
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  orderType: "dine-in" | "takeaway" | null;
  tableNumber: string | null;
  uiLanguage: SupportedLanguage;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
}

const OrderConfirmationDialog: React.FC<OrderConfirmationDialogProps> = ({
  isOpen,
  onClose,
  cart,
  orderNumber,
  restaurant,
  orderType,
  tableNumber,
  uiLanguage,
  getFormattedOptions,
  getFormattedToppings
}) => {
  const { t } = useTranslation(uiLanguage);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [countdown, setCountdown] = useState(10);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const { total, subtotal, tax } = calculateCartTotals(cart);

  // Currency symbol helper
  const CURRENCY_SYMBOLS: Record<string, string> = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    TRY: "₺",
    JPY: "¥",
    CAD: "$",
    AUD: "$",
    CHF: "Fr.",
    CNY: "¥",
    RUB: "₽"
  };
  const getCurrencySymbol = (currency: string = "EUR"): string => {
    const code = currency.toUpperCase();
    return CURRENCY_SYMBOLS[code] || code;
  };

  // Handle countdown and auto-close
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto close after countdown
    const closeTimer = setTimeout(() => {
      onClose();
    }, 10000);
    return () => {
      clearInterval(timer);
      clearTimeout(closeTimer);
    };
  }, [isOpen, onClose]);

  // Handle printing when dialog opens with enhanced QZ Tray support
  useEffect(() => {
    if (isOpen && !hasPrinted && restaurant?.id) {
      handlePrintReceipt();
    }
  }, [isOpen, restaurant?.id]);
  
  const handlePrintReceipt = async () => {
    if (!restaurant?.id || hasPrinted || isPrinting) return;
    
    try {
      setIsPrinting(true);

      // Fetch print configuration including QZ Tray settings
      const { data: printConfig, error } = await supabase
        .from('restaurant_print_config')
        .select('api_key, configured_printers, browser_printing_enabled, qz_tray_printers')
        .eq('restaurant_id', restaurant.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching print configuration:", error);
      }

      // Determine printing method priority:
      // 1. QZ Tray (if configured and available)
      // 2. PrintNode (if configured)
      // 3. Browser printing (fallback)

      let printingSuccessful = false;

      // Try QZ Tray first if configured
      if (printConfig?.qz_tray_printers && Array.isArray(printConfig.qz_tray_printers) && printConfig.qz_tray_printers.length > 0) {
        console.log("Attempting QZ Tray printing...");
        
        try {
          toast({
            title: t("order.printing"),
            description: "Printing via QZ Tray..."
          });

          // Use the enhanced printReceipt function with QZ Tray
          await printReceipt('receipt-content', 'qz-tray', printConfig.qz_tray_printers[0]);
          printingSuccessful = true;
          console.log("QZ Tray printing successful");
        } catch (qzError) {
          console.error("QZ Tray printing failed:", qzError);
          // Continue to try other methods
        }
      }

      // Try PrintNode if QZ Tray failed or wasn't configured
      if (!printingSuccessful && printConfig?.api_key && printConfig?.configured_printers) {
        console.log("Attempting PrintNode printing...");
        
        const printerArray = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers : [];
        const printerIds = printerArray.map(id => String(id));
        
        if (printerIds.length > 0) {
          try {
            await sendReceiptToPrintNode(printConfig.api_key, printerIds, {
              restaurant,
              cart,
              orderNumber,
              tableNumber,
              orderType,
              subtotal,
              tax,
              total,
              getFormattedOptions,
              getFormattedToppings,
              uiLanguage
            });
            printingSuccessful = true;
            console.log("PrintNode printing successful");
          } catch (printNodeError) {
            console.error("PrintNode printing failed:", printNodeError);
          }
        }
      }

      // Fall back to browser printing if other methods failed
      if (!printingSuccessful) {
        const shouldUseBrowserPrinting = !isMobile && (printConfig === null || printConfig?.browser_printing_enabled !== false);
        
        if (shouldUseBrowserPrinting) {
          console.log("Using browser printing as fallback");
          
          toast({
            title: t("order.printing"),
            description: t("order.printingPreparation")
          });

          setTimeout(async () => {
            try {
              await printReceipt('receipt-content', 'browser');
              console.log("Browser printing triggered successfully");
            } catch (printError) {
              console.error("Error during browser printing:", printError);
              toast({
                title: t("order.printError"),
                description: t("order.printErrorDesc"),
                variant: "destructive"
              });
            }
          }, 500);
        } else {
          console.log("All printing methods failed or disabled");
        }
      }

      setHasPrinted(true);
    } catch (error) {
      console.error("Error during receipt printing:", error);
      toast({
        title: t("order.error"),
        description: t("order.errorPrinting"),
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };
  
  const sendReceiptToPrintNode = async (apiKey: string, printerIds: string[], orderData: {
    restaurant: typeof restaurant;
    cart: CartItem[];
    orderNumber: string;
    tableNumber?: string | null;
    orderType: "dine-in" | "takeaway" | null;
    subtotal: number;
    tax: number;
    total: number;
    getFormattedOptions: (item: CartItem) => string;
    getFormattedToppings: (item: CartItem) => string;
    uiLanguage?: SupportedLanguage;
  }) => {
    try {
      // Generate receipt content
      const receiptContent = generatePlainTextReceipt(
        orderData.cart,
        orderData.restaurant,
        orderData.orderType,
        orderData.tableNumber,
        orderData.orderNumber,
        orderData.restaurant?.currency?.toUpperCase() || 'EUR',
        orderData.total,
        orderData.subtotal,
        orderData.tax,
        10,
        (key) => t(key)
      );

      // Encode content for sending
      const textEncoder = new TextEncoder();
      const encodedBytes = textEncoder.encode(receiptContent);
      const encodedContent = btoa(Array.from(encodedBytes).map(byte => String.fromCharCode(byte)).join(''));
      
      console.log(`Sending receipt to ${printerIds.length} configured printers`);
      
      for (const printerId of printerIds) {
        console.log(`Sending to printer ID: ${printerId}`);
        
        // Make secure API call
        const response = await fetch('https://api.printnode.com/printjobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(apiKey + ':')}`
          },
          body: JSON.stringify({
            printer: parseInt(printerId, 10) || printerId,
            title: `Order #${orderData.orderNumber}`,
            contentType: "raw_base64",
            content: encodedContent,
            source: "Restaurant Kiosk"
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error sending print job: ${response.status}`);
        } else {
          console.log(`Print receipt sent successfully`);
        }
      }
    } catch (error) {
      console.error("Error sending receipt to printer");
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl rounded-lg overflow-hidden">
        <div className="flex flex-col items-center text-center p-4 space-y-6">
          {/* Order Confirmation Header */}
          <div className="bg-green-100 rounded-full p-4 mb-2">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-green-800">
            {t("orderConfirmation.title")}
          </h2>
          
          {/* Order Details */}
          <div className="space-y-2 w-full">
            <p className="flex items-center justify-center gap-2">
              <Receipt className="h-5 w-5 text-gray-600" />
              {t("orderConfirmation.ticketPrinted")}
            </p>
            <p className="flex items-center justify-center gap-2">
              <Printer className="h-5 w-5 text-gray-600" />
              {isPrinting ? t("orderConfirmation.printing") : t("orderConfirmation.printed")}
            </p>
            <p>{t("orderConfirmation.preparation")}</p>
          </div>
          
          {/* Payment Section */}
          <div className="bg-blue-50 p-4 rounded-lg w-full">
            <h3 className="font-bold text-blue-800 mb-2 text-3xl">
              {t("orderConfirmation.payNow")}
            </h3>
            <p className="text-xl">{t("orderConfirmation.paymentInstructions")}</p>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>{t("orderConfirmation.total")}:</span>
                <span>{total.toFixed(2)} {getCurrencySymbol(restaurant?.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t("orderConfirmation.orderNumber")}:</span>
                <span>#{orderNumber}</span>
              </div>
            </div>
          </div>
          
          {/* Warning */}
          <div className="bg-yellow-50 p-3 rounded-md w-full">
            <p className="text-sm text-yellow-800">
              {t("orderConfirmation.preparationWarning")}
            </p>
          </div>
          
          {/* Thank You Message */}
          <p className="font-medium">{t("orderConfirmation.thankYou")}</p>
          
          {/* Countdown Timer */}
          <div className="flex items-center text-gray-500 mt-2">
            <Clock className="h-4 w-4 mr-1" />
            <span>{t("orderConfirmation.redirecting")} {countdown}s</span>
          </div>
        </div>
      </DialogContent>

      {/* Hidden Receipt Component for Printing */}
      <OrderReceipt 
        restaurant={restaurant} 
        cart={cart} 
        orderNumber={orderNumber} 
        tableNumber={tableNumber} 
        orderType={orderType} 
        getFormattedOptions={getFormattedOptions} 
        getFormattedToppings={getFormattedToppings} 
        uiLanguage={uiLanguage} 
      />
    </Dialog>
  );
};

export default OrderConfirmationDialog;
