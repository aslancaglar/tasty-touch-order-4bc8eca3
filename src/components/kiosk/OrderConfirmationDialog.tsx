
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Printer, X } from "lucide-react";
import { CartItem, Restaurant, OrderType } from "@/types/database-types";
import { supabase } from "@/integrations/supabase/client";
import { printReceipt } from "@/utils/print-utils";
import { useToast } from "@/hooks/use-toast";
import OrderReceipt from "./OrderReceipt";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  orderNumber: string;
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber?: string | null;
  uiLanguage: "fr" | "en" | "tr";
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
  const [isPrinting, setIsPrinting] = useState(false);
  const [printConfig, setPrintConfig] = useState<any>(null);
  const { toast } = useToast();

  // Fetch print configuration
  useEffect(() => {
    const fetchPrintConfig = async () => {
      if (!restaurant?.id) return;

      try {
        const { data, error } = await supabase
          .from('restaurant_print_config')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .single();

        if (error) {
          console.log('No print config found or error:', error);
          setPrintConfig(null);
          return;
        }

        setPrintConfig(data);
      } catch (error) {
        console.error('Error fetching print config:', error);
        setPrintConfig(null);
      }
    };

    if (isOpen && restaurant?.id) {
      fetchPrintConfig();
    }
  }, [isOpen, restaurant?.id]);

  const handlePrint = async () => {
    if (!cart.length || isPrinting) return;

    setIsPrinting(true);
    
    try {
      // First, determine the best printing method
      let printMethod: 'qz-tray' | 'browser' | 'auto' = 'auto';
      let qzPrinterName: string | undefined;

      // Check if we have QZ Tray configuration
      if (printConfig?.configured_printers?.length > 0) {
        const qzPrinters = printConfig.configured_printers.filter((p: any) => p.type === 'qz-tray');
        if (qzPrinters.length > 0) {
          printMethod = 'qz-tray';
          qzPrinterName = qzPrinters[0].name;
        }
      }

      // Fallback to browser printing if enabled
      if (printMethod === 'auto' && printConfig?.browser_printing_enabled !== false) {
        printMethod = 'browser';
      }

      console.log('Attempting to print receipt with method:', printMethod, 'printer:', qzPrinterName);

      // Attempt to print
      await printReceipt('order-receipt-content', printMethod, qzPrinterName);
      
      toast({
        title: uiLanguage === 'fr' ? "Impression réussie" : uiLanguage === 'en' ? "Print successful" : "Yazdırma başarılı",
        description: uiLanguage === 'fr' ? "Le reçu a été imprimé avec succès" : uiLanguage === 'en' ? "Receipt printed successfully" : "Fiş başarıyla yazdırıldı",
      });

    } catch (error) {
      console.error('Print error:', error);
      
      toast({
        title: uiLanguage === 'fr' ? "Erreur d'impression" : uiLanguage === 'en' ? "Print error" : "Yazdırma hatası",
        description: uiLanguage === 'fr' ? "Impossible d'imprimer le reçu" : uiLanguage === 'en' ? "Failed to print receipt" : "Fiş yazdırılamadı",
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const getText = (key: string): string => {
    const translations = {
      fr: {
        orderConfirmed: "Commande confirmée !",
        orderNumber: "Numéro de commande",
        thankYou: "Merci pour votre commande",
        preparationMessage: "Votre commande est en cours de préparation. Vous serez notifié quand elle sera prête.",
        printReceipt: "Imprimer le reçu",
        printing: "Impression...",
        close: "Fermer"
      },
      en: {
        orderConfirmed: "Order confirmed!",
        orderNumber: "Order number",
        thankYou: "Thank you for your order",
        preparationMessage: "Your order is being prepared. You'll be notified when it's ready.",
        printReceipt: "Print receipt",
        printing: "Printing...",
        close: "Close"
      },
      tr: {
        orderConfirmed: "Sipariş onaylandı!",
        orderNumber: "Sipariş numarası",
        thankYou: "Siparişiniz için teşekkürler",
        preparationMessage: "Siparişiniz hazırlanıyor. Hazır olduğunda bilgilendirileceksiniz.",
        printReceipt: "Fiş yazdır",
        printing: "Yazdırılıyor...",
        close: "Kapat"
      }
    };

    return translations[uiLanguage]?.[key as keyof typeof translations.fr] || translations.fr[key as keyof typeof translations.fr];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-6 w-6" />
            {getText('orderConfirmed')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Number Display */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">{getText('orderNumber')}</p>
            <div className="bg-black text-white text-2xl font-bold py-3 px-6 rounded-lg inline-block">
              #{orderNumber}
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{getText('thankYou')}</h3>
            <p className="text-gray-600 text-sm">
              {getText('preparationMessage')}
            </p>
          </div>

          {/* Hidden receipt content for printing */}
          <div id="order-receipt-content" style={{ display: 'none' }}>
            <OrderReceipt
              cart={cart}
              orderNumber={orderNumber}
              restaurant={restaurant}
              orderType={orderType}
              tableNumber={tableNumber}
              uiLanguage={uiLanguage}
              getFormattedOptions={getFormattedOptions}
              getFormattedToppings={getFormattedToppings}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              variant="outline"
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              {isPrinting ? getText('printing') : getText('printReceipt')}
            </Button>
            
            <Button 
              onClick={onClose}
              className="flex-1"
            >
              {getText('close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderConfirmationDialog;
