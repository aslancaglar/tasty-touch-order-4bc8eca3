
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "@/components/kiosk/OrderReceipt";
import { supabase } from "@/integrations/supabase/client";
import { calculateCartTotals } from "@/utils/price-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import OrderItem from "./OrderItem";
import OrderTotals from "./OrderTotals";
import { useOrderPrintHandler } from "./OrderPrintHandler";

const translations = {
  fr: {
    orderSummary: "RÉSUMÉ DE COMMANDE",
    orderedItems: "ARTICLES COMMANDÉS",
    confirm: "CONFIRMER LA COMMANDE",
    back: "Retour",
  },
  en: {
    orderSummary: "ORDER SUMMARY",
    orderedItems: "ORDERED ITEMS",
    confirm: "CONFIRM ORDER",
    back: "Back",
  },
  tr: {
    orderSummary: "SİPARİŞ ÖZETİ",
    orderedItems: "SİPARİŞ EDİLEN ÜRÜNLER",
    confirm: "SİPARİŞİ ONAYLA",
    back: "Geri",
  }
};

interface OrderSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onPlaceOrder: () => void;
  placingOrder: boolean;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  restaurant?: {
    id?: string;
    name: string;
    location?: string;
  } | null;
  orderType?: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  uiLanguage?: "fr" | "en" | "tr";
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  isOpen,
  onClose,
  cart,
  onPlaceOrder,
  placingOrder,
  getFormattedOptions,
  getFormattedToppings,
  restaurant = { name: "Restaurant" },
  orderType = null,
  tableNumber = null,
  uiLanguage = "fr",
}) => {
  const [orderNumber, setOrderNumber] = useState<string>("0");
  
  const { total, subtotal, tax } = calculateCartTotals(cart);

  // Helper function to translate text
  const t = (key: keyof typeof translations["en"]) =>
    translations[uiLanguage]?.[key] ?? translations.fr[key];

  const { handlePrint } = useOrderPrintHandler({
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

  useEffect(() => {
    const fetchOrderCount = async () => {
      if (restaurant?.id) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id);
        setOrderNumber(((count || 0) + 1).toString());
      }
    };
    fetchOrderCount();
  }, [restaurant?.id]);
  
  const handleConfirmOrder = async () => {
    onPlaceOrder();
    await handlePrint();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0 flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-bold">{t("orderSummary")}</DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Scrollable Content Area */}
        <ScrollArea className="flex-grow overflow-auto p-6">
          <h3 className="font-bold text-lg mb-4">{t("orderedItems")}</h3>
          
          <div className="space-y-6 mb-6">
            {cart.map((item) => (
              <OrderItem
                key={item.id}
                item={item}
                getFormattedOptions={getFormattedOptions}
              />
            ))}
          </div>
          
          <OrderTotals
            subtotal={subtotal}
            tax={tax}
            total={total}
            uiLanguage={uiLanguage}
          />
        </ScrollArea>
        
        {/* Fixed Footer */}
        <div className="p-4 bg-gray-50 border-t flex-shrink-0">
          <Button 
            className="w-full bg-green-800 hover:bg-green-900 text-white py-6"
            onClick={handleConfirmOrder}
            disabled={placingOrder}
          >
            <Check className="mr-2 h-5 w-5" />
            {t("confirm")}
          </Button>
        </div>
      </DialogContent>

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

export default OrderSummary;
