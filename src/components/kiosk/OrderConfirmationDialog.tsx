
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

      // Fetch print configuration including plain text API key
      const { data: printConfig, error } = await supabase
        .from('restaurant_print_config')
        .select('configured_printers, browser_printing_enabled, api_key')
        .eq('restaurant_id', restaurant.id)
        .single();
      
      if (error) {
        console.error("Error fetching print configuration:", error);
        setIsPrinting(false);
        return;
      }

      // Handle browser printing
      const shouldUseBrowserPrinting = !isMobile && (printConfig === null || printConfig.browser_printing_enabled !== false);
      if (shouldUseBrowserPrinting) {
        console.log("Using browser printing for receipt");
        toast({
          title: t("order.printing"),
          description: t("order.printingPreparation")
        });
        setTimeout(() => {
          try {
            printReceipt('receipt-content');
            console.log("Print receipt triggered successfully");
          } catch (printError) {
            console.error("Error during browser printing:", printError);
            toast({
              title: t("order.printError"),
              description: t("order.printErrorDesc"),
              variant: "destructive"
            });
          }
          setIsPrinting(false);
          setHasPrinted(true);
        }, 500);
      } else {
        console.log("Browser printing disabled for this device or restaurant");
      }

      // Handle PrintNode printing using plain text API key
      if (printConfig?.configured_printers && printConfig?.api_key) {
        const printerArray = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers : [];
        const printerIds = printerArray.map(id => String(id));
        if (printerIds.length > 0) {
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
        }
        setIsPrinting(false);
        setHasPrinted(true);
      }
    } catch (error) {
      console.error("Error during receipt printing:", error);
      toast({
        title: t("order.error"),
        description: t("order.errorPrinting"),
        variant: "destructive"
      });
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
        
        // Make direct API call to PrintNode
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
          const errorText = await response.text();
          console.error(`Error sending print job to printer ${printerId}:`, response.status, errorText);
          throw new Error(`Error sending print job: ${response.status}`);
        } else {
          console.log(`Print receipt sent successfully to printer ${printerId}`);
        }
      }
    } catch (error) {
      console.error("Error sending receipt to printer:", error);
      toast({
        title: t("order.error"),
        description: t("order.errorPrinting"),
        variant: "destructive"
      });
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
      <OrderReceipt restaurant={restaurant} cart={cart} orderNumber={orderNumber} tableNumber={tableNumber} orderType={orderType} getFormattedOptions={getFormattedOptions} getFormattedToppings={getFormattedToppings} uiLanguage={uiLanguage} />
    </Dialog>;
};

export default OrderConfirmationDialog;
