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
import { printNodeService } from "@/services/printnode-service";
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
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
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

  // Handle printing when dialog opens
  useEffect(() => {
    if (isOpen && !hasPrinted && restaurant?.id) {
      handlePrintReceipt();
    }
  }, [isOpen, restaurant?.id]);
  
  const handlePrintReceipt = async () => {
    if (!restaurant?.id || hasPrinted || isPrinting) return;
    
    try {
      setIsPrinting(true);
      setPrintStatus('printing');
      console.log("Starting enhanced print process for order:", orderNumber);

      // Test PrintNode configuration first
      const connectionTest = await printNodeService.testConnection(restaurant.id);
      console.log("PrintNode connection test:", connectionTest);

      // Fetch print configuration with enhanced error handling
      const { data: printConfig, error: configError } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers, browser_printing_enabled')
        .eq('restaurant_id', restaurant.id)
        .single();

      if (configError && configError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error fetching print configuration:", configError);
        toast({
          title: t("order.error"),
          description: "Could not fetch print settings",
          variant: "destructive"
        });
        setPrintStatus('error');
        return;
      }

      console.log("Print configuration:", printConfig);

      // Handle browser printing
      const shouldUseBrowserPrinting = !isMobile && (printConfig === null || printConfig?.browser_printing_enabled !== false);
      if (shouldUseBrowserPrinting) {
        console.log("Using browser printing for receipt");
        toast({
          title: t("order.printing"),
          description: t("order.printingPreparation")
        });
        
        setTimeout(() => {
          try {
            printReceipt('receipt-content');
            console.log("Browser print triggered successfully");
            setPrintStatus('success');
          } catch (printError) {
            console.error("Browser printing error:", printError);
            toast({
              title: t("order.printError"),
              description: "Browser printing failed",
              variant: "destructive"
            });
            setPrintStatus('error');
          }
        }, 500);
      }

      // Handle PrintNode printing with enhanced service
      if (connectionTest.success && printConfig?.configured_printers) {
        const printerArray = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers : [];
        const printerIds = printerArray.map(id => String(id));
        
        if (printerIds.length > 0) {
          console.log("Attempting PrintNode printing with enhanced service");
          
          try {
            // Generate receipt content
            const receiptContent = generatePlainTextReceipt(
              cart,
              restaurant,
              orderType,
              tableNumber,
              orderNumber,
              restaurant?.currency?.toUpperCase() || 'EUR',
              total,
              subtotal,
              tax,
              10,
              (key) => t(key)
            );

            const printResults = await printNodeService.sendPrintJob({
              printerIds,
              title: `Order #${orderNumber}`,
              content: receiptContent,
              restaurantId: restaurant.id
            });
            
            const successfulPrints = printResults.filter(r => r.success);
            const failedPrints = printResults.filter(r => !r.success);
            
            if (successfulPrints.length > 0) {
              console.log(`Successfully sent to ${successfulPrints.length} printers`);
              toast({
                title: t("order.printing"),
                description: `Sent to ${successfulPrints.length} printer(s)`,
              });
              setPrintStatus('success');
            }
            
            if (failedPrints.length > 0) {
              console.error(`Failed to send to ${failedPrints.length} printers`);
              toast({
                title: t("order.printError"),
                description: `Failed to send to ${failedPrints.length} printer(s)`,
                variant: "destructive"
              });
              if (successfulPrints.length === 0) {
                setPrintStatus('error');
              }
            }
            
          } catch (printNodeError) {
            console.error("PrintNode printing failed:", printNodeError);
            toast({
              title: t("order.printError"),
              description: `PrintNode error: ${printNodeError.message}`,
              variant: "destructive"
            });
            setPrintStatus('error');
          }
        } else {
          console.log("No printers configured for PrintNode");
        }
      } else if (!connectionTest.success) {
        console.log("PrintNode not configured or connection failed:", connectionTest.message);
        toast({
          title: t("order.printError"),
          description: connectionTest.message,
          variant: "destructive"
        });
      }

      setHasPrinted(true);

    } catch (error) {
      console.error("Critical error during enhanced printing process:", error);
      toast({
        title: t("order.error"),
        description: "Critical printing error occurred",
        variant: "destructive"
      });
      setPrintStatus('error');
    } finally {
      setIsPrinting(false);
    }
  };
  
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl rounded-lg overflow-hidden">
        <div className="flex flex-col items-center text-center p-4 space-y-6">
          {/* Order Confirmation Header */}
          <div className="bg-green-100 rounded-full p-4 mb-2">
            <Check className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-green-800">
            {t("orderConfirmation.title")}
          </h2>
          
          {/* Order Details with Print Status */}
          <div className="space-y-2 w-full">
            <p className="flex items-center justify-center gap-2">
              <Receipt className="h-5 w-5 text-gray-600" />
              {t("orderConfirmation.ticketPrinted")}
            </p>
            <p className="flex items-center justify-center gap-2">
              <Printer className={`h-5 w-5 ${
                printStatus === 'success' ? 'text-green-600' : 
                printStatus === 'error' ? 'text-red-600' : 
                'text-gray-600'
              }`} />
              {printStatus === 'printing' && t("orderConfirmation.printing")}
              {printStatus === 'success' && t("orderConfirmation.printed")}
              {printStatus === 'error' && "Print Error"}
              {printStatus === 'idle' && t("orderConfirmation.printed")}
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
    </Dialog>;
};

export default OrderConfirmationDialog;
