
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
import { kioskPrintService } from "@/services/kiosk-print-service";
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
  const {
    t
  } = useTranslation(uiLanguage);
  const {
    toast
  } = useToast();
  const isMobile = useIsMobile();
  const [countdown, setCountdown] = useState(10);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [printStatus, setPrintStatus] = useState<'pending' | 'success' | 'partial' | 'failed'>('pending');
  const {
    total,
    subtotal,
    tax
  } = calculateCartTotals(cart);

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
      console.log('[OrderConfirmationDialog] Dialog opened, starting print process');
      handlePrintReceipt();
    }
  }, [isOpen, restaurant?.id]);
  
  const handlePrintReceipt = async () => {
    if (!restaurant?.id || hasPrinted || isPrinting) {
      console.log('[OrderConfirmationDialog] Skipping print - conditions not met:', {
        restaurantId: !!restaurant?.id,
        hasPrinted,
        isPrinting
      });
      return;
    }
    
    try {
      setIsPrinting(true);
      setPrintStatus('pending');

      console.log('[OrderConfirmationDialog] Starting print process for:', {
        restaurantId: restaurant.id,
        orderNumber,
        orderType,
        tableNumber
      });

      // Fetch print configuration
      const {
        data: printConfig,
        error
      } = await supabase.from('restaurant_print_config').select('configured_printers, browser_printing_enabled').eq('restaurant_id', restaurant.id).single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error("[OrderConfirmationDialog] Error fetching print configuration:", error);
        // Continue anyway - the service will create a default config
      } else {
        console.log('[OrderConfirmationDialog] Print config loaded:', printConfig);
      }

      // Handle browser printing
      const shouldUseBrowserPrinting = !isMobile && (printConfig === null || printConfig?.browser_printing_enabled !== false);
      let browserPrintAttempted = false;

      if (shouldUseBrowserPrinting) {
        console.log("[OrderConfirmationDialog] Using browser printing for receipt");
        toast({
          title: t("order.printing"),
          description: t("order.printingPreparation")
        });
        
        browserPrintAttempted = true;
        setTimeout(() => {
          try {
            printReceipt('receipt-content');
            console.log("[OrderConfirmationDialog] Browser print triggered successfully");
          } catch (printError) {
            console.error("[OrderConfirmationDialog] Error during browser printing:", printError);
          }
        }, 500);
      }

      // Handle PrintNode printing using kiosk service
      let kioskPrintResult = null;
      
      // Generate receipt content for PrintNode
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

      console.log('[OrderConfirmationDialog] Generated receipt content length:', receiptContent.length);

      // Always try kiosk service to get proper feedback
      try {
        console.log(`[OrderConfirmationDialog] Calling kiosk print service for restaurant ${restaurant.id}`);
        
        // Prepare printer IDs if configured
        const printerIds = printConfig?.configured_printers && Array.isArray(printConfig.configured_printers)
          ? printConfig.configured_printers.map(id => String(id))
          : [];

        console.log('[OrderConfirmationDialog] Using printer IDs:', printerIds);

        // Use the kiosk print service
        kioskPrintResult = await kioskPrintService.printReceipt({
          restaurantId: restaurant.id,
          orderNumber,
          receiptContent,
          printerIds
        });

        console.log('[OrderConfirmationDialog] Kiosk print result:', kioskPrintResult);

      } catch (printError) {
        console.error("[OrderConfirmationDialog] Error with kiosk print service:", printError);
        kioskPrintResult = {
          success: false,
          results: [],
          summary: { successful: 0, failed: 0, total: 0 },
          message: printError instanceof Error ? printError.message : 'Unknown error'
        };
      }

      // Determine overall print status
      const kioskSuccess = kioskPrintResult?.success && kioskPrintResult.summary.successful > 0;
      const kioskPartial = kioskPrintResult?.success && kioskPrintResult.summary.failed > 0;
      
      console.log('[OrderConfirmationDialog] Print status evaluation:', {
        kioskSuccess,
        kioskPartial,
        browserPrintAttempted,
        kioskMessage: kioskPrintResult?.message
      });
      
      if (kioskSuccess && !kioskPartial) {
        setPrintStatus('success');
        toast({
          title: "Impression réussie",
          description: `Reçu envoyé à ${kioskPrintResult.summary.successful} imprimante(s)`,
        });
      } else if (kioskSuccess && kioskPartial) {
        setPrintStatus('partial');
        toast({
          title: "Impression partielle",
          description: `${kioskPrintResult.summary.successful} imprimante(s) réussie(s), ${kioskPrintResult.summary.failed} échec(s)`,
          variant: "destructive"
        });
      } else if (browserPrintAttempted) {
        setPrintStatus('success');
        // Don't show additional toasts for browser printing
      } else {
        setPrintStatus('failed');
        const errorMessage = kioskPrintResult?.message || "Impossible d'imprimer le reçu";
        console.error('[OrderConfirmationDialog] Print failed with message:', errorMessage);
        toast({
          title: "Erreur d'impression", 
          description: errorMessage,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error("[OrderConfirmationDialog] Error during receipt printing:", error);
      setPrintStatus('failed');
      toast({
        title: t("order.error"),
        description: t("order.errorPrinting"),
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
      setHasPrinted(true);
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
              <Printer className={`h-5 w-5 ${
                printStatus === 'success' ? 'text-green-600' : 
                printStatus === 'partial' ? 'text-yellow-600' :
                printStatus === 'failed' ? 'text-red-600' : 'text-gray-600'
              }`} />
              {isPrinting ? (
                t("orderConfirmation.printing")
              ) : printStatus === 'success' ? (
                'Impression réussie'
              ) : printStatus === 'partial' ? (
                'Impression partielle'
              ) : printStatus === 'failed' ? (
                'Échec d\'impression'
              ) : (
                t("orderConfirmation.printed")
              )}
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
