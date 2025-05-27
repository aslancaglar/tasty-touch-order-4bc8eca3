
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/types/database-types";
import { printReceipt } from "@/utils/print-utils";
import { generatePlainTextReceipt } from "@/utils/receipt-templates";
import { qzTrayService } from "@/services/qz-tray-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface OrderPrintHandlerProps {
  restaurant?: {
    id?: string;
    name: string;
    location?: string;
  } | null;
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType?: "dine-in" | "takeaway" | null;
  subtotal: number;
  tax: number;
  total: number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: "fr" | "en" | "tr";
}

export const useOrderPrintHandler = ({
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
  uiLanguage = "fr"
}: OrderPrintHandlerProps) => {
  const [qzPrintAttempted, setQzPrintAttempted] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handlePrint = async () => {
    if (restaurant?.id) {
      try {
        console.log("Device info - Width:", window.innerWidth, "isMobile:", isMobile, "userAgent:", navigator.userAgent);
        
        // Préparer les données de commande
        const orderData = {
          restaurant,
          cart,
          orderNumber,
          tableNumber,
          orderType,
          subtotal,
          tax,
          total,
          getFormattedOptions,
          getFormattedToppings
        };

        // 1. Tentative d'impression QZ Tray (nouvelle méthode) - indépendante
        if (!qzPrintAttempted) {
          setQzPrintAttempted(true);
          try {
            const isQZAvailable = await qzTrayService.isQZTrayAvailable();
            if (isQZAvailable) {
              console.log("QZ Tray available, attempting to print tickets...");
              
              // Impression QZ Tray en arrière-plan - ne bloque pas les autres méthodes
              qzTrayService.printOrderTickets(orderData).then(() => {
                console.log("QZ Tray printing completed successfully");
                toast({
                  title: "QZ Tray",
                  description: "Tickets imprimés avec succès via QZ Tray"
                });
              }).catch((qzError) => {
                console.warn("QZ Tray printing failed, continuing with other methods:", qzError);
              });
            } else {
              console.log("QZ Tray not available, skipping QZ printing");
            }
          } catch (qzError) {
            console.warn("QZ Tray check failed, continuing with existing methods:", qzError);
          }
        }

        // 2. Méthodes d'impression existantes (inchangées)
        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('api_key, configured_printers, browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .single();
        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }
        const shouldUseBrowserPrinting = 
          !isMobile && 
          (printConfig === null || printConfig.browser_printing_enabled !== false);
        if (shouldUseBrowserPrinting) {
          console.log("Using browser printing for receipt");
          toast({
            title: "Impression",
            description: "Préparation de l'impression du reçu..."
          });
          setTimeout(() => {
            try {
              printReceipt('receipt-content');
              console.log("Print receipt triggered successfully");
            } catch (printError) {
              console.error("Error during browser printing:", printError);
              toast({
                title: "Erreur d'impression",
                description: "Impossible d'imprimer le reçu. Vérifiez les paramètres de votre navigateur.",
                variant: "destructive"
              });
            }
          }, 500);
        } else {
          console.log("Browser printing disabled for this device or restaurant");
          if (isMobile) {
            console.log("Browser printing disabled because this is a mobile or tablet device");
          } else if (printConfig?.browser_printing_enabled === false) {
            console.log("Browser printing disabled in restaurant settings");
          }
        }
        if (printConfig?.api_key && printConfig?.configured_printers) {
          const printerArray = Array.isArray(printConfig.configured_printers) 
            ? printConfig.configured_printers 
            : [];
          const printerIds = printerArray.map(id => String(id));
          if (printerIds.length > 0) {
            await sendReceiptToPrintNode(
              printConfig.api_key,
              printerIds,
              orderData
            );
          }
        }
      } catch (error) {
        console.error("Error during receipt printing:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de l'impression",
          variant: "destructive"
        });
      }
    }
  };

  const sendReceiptToPrintNode = async (
    apiKey: string,
    printerIds: string[],
    orderData: {
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
    }
  ) => {
    try {
      const receiptContent = generatePrintNodeReceipt(orderData);
      
      // Fix: Properly encode special characters for UTF-8
      const textEncoder = new TextEncoder();
      const encodedBytes = textEncoder.encode(receiptContent);
      const encodedContent = btoa(
        Array.from(encodedBytes)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );
      
      console.log("Sending receipt to PrintNode printers:", printerIds);
      for (const printerId of printerIds) {
        console.log(`Sending to printer ID: ${printerId}`);
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
          console.error(`PrintNode API error: ${response.status}`, errorText);
          throw new Error(`Error sending print job: ${response.status} - ${errorText}`);
        } else {
          console.log(`PrintNode receipt sent successfully to printer ${printerId}`);
        }
      }
    } catch (error) {
      console.error("Error sending receipt to PrintNode:", error);
    }
  };

  const generatePrintNodeReceipt = (orderData: {
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
  }): string => {
    return generatePlainTextReceipt(
      orderData.cart,
      orderData.restaurant,
      orderData.orderType,
      orderData.tableNumber,
      orderData.orderNumber,
      "EUR",
      orderData.total,
      orderData.subtotal,
      orderData.tax,
      10,
      (key) => {
        const translations: Record<string, string> = {
          'receipt.orderNumber': uiLanguage === 'fr' ? 'Commande No' : uiLanguage === 'tr' ? 'Sipariş No' : 'Order No',
          'receipt.orderType': uiLanguage === 'fr' ? 'Type de commande' : uiLanguage === 'tr' ? 'Sipariş Tipi' : 'Order Type',
          'receipt.dineIn': uiLanguage === 'fr' ? 'Sur place' : uiLanguage === 'tr' ? 'Masa Servisi' : 'Dine In',
          'receipt.takeaway': uiLanguage === 'fr' ? 'À emporter' : uiLanguage === 'tr' ? 'Paket Servisi' : 'Takeaway',
          'receipt.tableNumber': uiLanguage === 'fr' ? 'Table No' : uiLanguage === 'tr' ? 'Masa No' : 'Table No',
          'receipt.subtotal': uiLanguage === 'fr' ? 'Sous-total' : uiLanguage === 'tr' ? 'Ara Toplam' : 'Subtotal',
          'receipt.vat': uiLanguage === 'fr' ? 'TVA' : uiLanguage === 'tr' ? 'KDV' : 'VAT',
          'receipt.total': uiLanguage === 'fr' ? 'Total' : uiLanguage === 'tr' ? 'Toplam' : 'Total',
          'receipt.thankYou': uiLanguage === 'fr' ? 'Merci pour votre visite!' : uiLanguage === 'tr' ? 'Ziyaretiniz için teşekkürler!' : 'Thank you for your visit!',
          'receipt.specialInstructions': uiLanguage === 'fr' ? 'Instructions spéciales' : uiLanguage === 'tr' ? 'Özel Talimatlar' : 'Special Instructions'
        };
        return translations[key] || key;
      }
    );
  };

  return { handlePrint };
};
