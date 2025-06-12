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
import { secureApiKeyService } from "@/services/secure-api-keys";
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
      handlePrintReceipt();
    }
  }, [isOpen, restaurant?.id]);
  
  const handlePrintReceipt = async () => {
    if (!restaurant?.id || hasPrinted || isPrinting) return;
    try {
      setIsPrinting(true);

      // Fetch print configuration (no longer includes api_key)
      const {
        data: printConfig,
        error
      } = await supabase.from('restaurant_print_config').select('configured_printers, browser_printing_enabled').eq('restaurant_id', restaurant.id).single();
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

      // Handle PrintNode printing (using secure API key service)
      if (printConfig?.configured_printers) {
        const printerArray = Array.isArray(printConfig.configured_printers) ? printConfig.configured_printers : [];
        const printerIds = printerArray.map(id => String(id));
        if (printerIds.length > 0) {
          try {
            console.log(`[OrderConfirmation] Attempting to retrieve PrintNode API key for restaurant ${restaurant.id}`);
            
            // Get API key securely with improved error handling
            const apiKey = await secureApiKeyService.retrieveApiKey(restaurant.id, 'printnode');
            
            if (apiKey) {
              console.log('[OrderConfirmation] API key retrieved successfully, sending to PrintNode');
              await sendReceiptToPrintNode(apiKey, printerIds, {
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
            } else {
              console.warn("No PrintNode API key found for restaurant");
              toast({
                title: "Information",
                description: "Clé API PrintNode non configurée",
                variant: "default"
              });
            }
          } catch (apiKeyError) {
            console.error("Error retrieving PrintNode API key:", apiKeyError);
            
            // Handle different types of errors with appropriate user messages
            let errorMessage = "Erreur lors de la récupération de la clé API";
            if (apiKeyError instanceof Error) {
              if (apiKeyError.message.includes('Authentication') || apiKeyError.message.includes('authentification')) {
                errorMessage = "Erreur d'authentification. Veuillez vous reconnecter.";
              } else if (apiKeyError.message.includes('Network')) {
                errorMessage = "Erreur de réseau. Vérifiez votre connexion.";
              } else if (apiKeyError.message.includes('permissions')) {
                errorMessage = "Permissions insuffisantes pour accéder à la clé API";
              }
            }
            
            toast({
              title: t("order.printError"),
              description: errorMessage,
              variant: "destructive"
            });
          }
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

  // Browser-compatible UTF-8 to base64 encoding
  const encodeToBase64 = (text: string): string => {
    try {
      // Method 1: Try modern approach with TextEncoder (Chrome, modern Firefox)
      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
      }
      
      // Method 2: Fallback for older browsers - handle UTF-8 manually
      const utf8Bytes = unescape(encodeURIComponent(text));
      return btoa(utf8Bytes);
    } catch (error) {
      console.error("Error encoding to base64:", error);
      // Method 3: Last resort - try direct btoa (may not work with special characters)
      try {
        return btoa(text);
      } catch (fallbackError) {
        console.error("Fallback encoding also failed:", fallbackError);
        throw new Error("Unable to encode receipt content");
      }
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
      console.log(`[PrintNode] Starting print job for order ${orderData.orderNumber}`);
      console.log(`[PrintNode] Browser: ${navigator.userAgent}`);
      
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

      console.log(`[PrintNode] Receipt content length: ${receiptContent.length} characters`);
      console.log(`[PrintNode] First 200 chars: ${receiptContent.substring(0, 200)}`);

      // Encode content using browser-compatible method
      let encodedContent: string;
      try {
        encodedContent = encodeToBase64(receiptContent);
        console.log(`[PrintNode] Successfully encoded content, base64 length: ${encodedContent.length}`);
      } catch (encodingError) {
        console.error("[PrintNode] Encoding failed:", encodingError);
        throw new Error(`Erreur d'encodage du reçu: ${encodingError.message}`);
      }
      
      console.log(`[PrintNode] Sending receipt to ${printerIds.length} configured printers`);
      
      const printResults = [];
      
      for (const printerId of printerIds) {
        console.log(`[PrintNode] Sending to printer ID: ${printerId}`);
        
        try {
          // Prepare the print job payload
          const printJobPayload = {
            printer: parseInt(printerId, 10) || printerId,
            title: `Order #${orderData.orderNumber}`,
            contentType: "raw_base64",
            content: encodedContent,
            source: "Restaurant Kiosk"
          };
          
          console.log(`[PrintNode] Print job payload for printer ${printerId}:`, {
            ...printJobPayload,
            content: `[BASE64 DATA - ${encodedContent.length} chars]`
          });
          
          // Make secure API call with enhanced error handling
          const response = await fetch('https://api.printnode.com/printjobs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${btoa(apiKey + ':')}`
            },
            body: JSON.stringify(printJobPayload)
          });
          
          console.log(`[PrintNode] Response status for printer ${printerId}: ${response.status}`);
          console.log(`[PrintNode] Response headers:`, Object.fromEntries(response.headers.entries()));
          
          // Read response text for better error handling
          const responseText = await response.text();
          console.log(`[PrintNode] Response text for printer ${printerId}:`, responseText);
          
          if (!response.ok) {
            let errorMessage = `PrintNode API error (${response.status})`;
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.message || errorData.error || errorMessage;
              console.error(`[PrintNode] API error details:`, errorData);
            } catch (parseError) {
              console.error(`[PrintNode] Could not parse error response:`, parseError);
              errorMessage = `${errorMessage}: ${responseText}`;
            }
            
            printResults.push({
              printerId,
              success: false,
              error: errorMessage
            });
            
            throw new Error(errorMessage);
          } else {
            console.log(`[PrintNode] Print job sent successfully to printer ${printerId}`);
            
            // Try to parse success response
            try {
              const successData = JSON.parse(responseText);
              console.log(`[PrintNode] Success response data:`, successData);
              printResults.push({
                printerId,
                success: true,
                jobId: successData.id
              });
            } catch (parseError) {
              console.log(`[PrintNode] Could not parse success response, but request was successful`);
              printResults.push({
                printerId,
                success: true,
                response: responseText
              });
            }
          }
        } catch (printerError) {
          console.error(`[PrintNode] Error sending to printer ${printerId}:`, printerError);
          printResults.push({
            printerId,
            success: false,
            error: printerError.message
          });
          
          // Continue to next printer instead of failing completely
          continue;
        }
      }
      
      // Check if any printer succeeded
      const successfulPrints = printResults.filter(result => result.success);
      const failedPrints = printResults.filter(result => !result.success);
      
      console.log(`[PrintNode] Print summary: ${successfulPrints.length} successful, ${failedPrints.length} failed`);
      
      if (successfulPrints.length > 0) {
        console.log(`[PrintNode] At least one printer succeeded`);
        toast({
          title: "Impression réussie",
          description: `Reçu envoyé à ${successfulPrints.length} imprimante(s)`,
        });
      }
      
      if (failedPrints.length > 0) {
        console.error(`[PrintNode] Some printers failed:`, failedPrints);
        toast({
          title: "Problème d'impression",
          description: `${failedPrints.length} imprimante(s) ont échoué`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error("[PrintNode] General error sending receipt to printer:", error);
      toast({
        title: "Erreur d'impression",
        description: `Impossible d'imprimer: ${error.message}`,
        variant: "destructive"
      });
      throw error;
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
