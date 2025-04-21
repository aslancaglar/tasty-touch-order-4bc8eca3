
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "./OrderReceipt";
import { printReceipt } from "@/utils/print-utils";
import { supabase } from "@/integrations/supabase/client";
import { calculateCartTotals } from "@/utils/price-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateStandardReceipt, getGroupedToppings } from "@/utils/receipt-templates";
import { useToast } from "@/hooks/use-toast";

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
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  isOpen,
  onClose,
  cart,
  onPlaceOrder,
  placingOrder,
  calculateSubtotal,
  calculateTax,
  getFormattedOptions,
  getFormattedToppings,
  restaurant = { name: "Restaurant" },
  orderType = null,
  tableNumber = null,
}) => {
  const [orderNumber, setOrderNumber] = useState<string>("0");
  const [requireTableSelection, setRequireTableSelection] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const { total, subtotal, tax } = calculateCartTotals(cart);

  useEffect(() => {
    console.log("OrderSummary mounted, isMobile:", isMobile, "userAgent:", navigator.userAgent);

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

    const fetchRequireTableSelection = async () => {
      if (!restaurant?.id) return;
      const { data, error } = await supabase
        .from('restaurant_print_config')
        .select('require_table_selection')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (!error && data) {
        setRequireTableSelection(data.require_table_selection ?? true);
      } else {
        setRequireTableSelection(true); // default to true
      }
    };
    fetchRequireTableSelection();
  }, [restaurant?.id, isMobile]);

  const separatorLine = '-'.repeat(28);

  const handleConfirmOrder = async () => {
    onPlaceOrder();

    if (restaurant?.id) {
      try {
        console.log("Device info - Width:", window.innerWidth, "isMobile:", isMobile, "userAgent:", navigator.userAgent);

        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('api_key, configured_printers, browser_printing_enabled, require_table_selection')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }

        // Only enable browser printing on desktop devices (not mobile or tablet)
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
              {
                restaurant,
                cart,
                orderNumber,
                tableNumber: printConfig.require_table_selection === false ? undefined : tableNumber,
                orderType,
                subtotal,
                tax,
                total,
                getFormattedOptions,
                getFormattedToppings
              }
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

      const encodedContent = btoa(
        new TextEncoder().encode(receiptContent)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
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
    return generateStandardReceipt({
      restaurant: orderData.restaurant,
      cart: orderData.cart,
      orderNumber: orderData.orderNumber,
      tableNumber: orderData.tableNumber,
      orderType: orderData.orderType,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      getFormattedOptions: orderData.getFormattedOptions,
      getFormattedToppings: orderData.getFormattedToppings
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-bold">RÉSUMÉ DE COMMANDE</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6">
          <h3 className="font-bold text-lg mb-4">ARTICLES COMMANDÉS</h3>

          <div className="space-y-6 mb-6">
            {cart.map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">{item.quantity}x</span>
                    <span className="font-medium">{item.menuItem.name}</span>
                  </div>
                  <span className="font-medium">{parseFloat(item.itemPrice.toString()).toFixed(2)} €</span>
                </div>

                {(getFormattedOptions(item) || (item.selectedToppings?.length > 0)) && (
                  <div className="pl-6 space-y-1 text-sm text-gray-600">
                    {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                      <div key={`${item.id}-option-${idx}`} className="flex justify-between">
                        <span>+ {option}</span>
                        <span>0.00 €</span>
                      </div>
                    ))}

                    {getGroupedToppings(item).map((group, groupIdx) => (
                      <div key={`${item.id}-cat-summary-${groupIdx}`}>
                        <div style={{ fontWeight: 500, paddingLeft: 0 }}>{group.category}:</div>
                        {group.toppings.map((topping, topIdx) => (
                          <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between">
                            <span style={{ paddingLeft: 6 }}>+ {topping}</span>
                            <span>0.00 €</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Total HT:</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>TVA:</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total TTC:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50">
          <Button 
            className="w-full bg-green-800 hover:bg-green-900 text-white py-6"
            onClick={handleConfirmOrder}
            disabled={placingOrder}
          >
            <Check className="mr-2 h-5 w-5" />
            CONFIRMER LA COMMANDE
          </Button>
          {orderType === "dine-in" && requireTableSelection && tableNumber && (
            <div className="mt-2 text-center text-sm text-gray-600">
              Table: {tableNumber}
            </div>
          )}
        </div>
      </DialogContent>

      <OrderReceipt
        restaurant={restaurant}
        cart={cart}
        orderNumber={orderNumber}
        tableNumber={requireTableSelection ? tableNumber : undefined}
        orderType={orderType}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
      />
    </Dialog>
  );
};

export default OrderSummary;

