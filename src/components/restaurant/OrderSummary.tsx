import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "@/components/kiosk/OrderReceipt";
import { printReceipt } from "@/utils/print-utils";
import { supabase } from "@/integrations/supabase/client";

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
  const [orderNumber, setOrderNumber] = useState<number>(0);
  const total = cart.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);
  const tva = total * 0.1;
  const subtotal = total - tva;

  useEffect(() => {
    const fetchOrderCount = async () => {
      if (restaurant?.id) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id);
        
        setOrderNumber((count || 0) + 1);
      }
    };

    fetchOrderCount();
  }, [restaurant?.id]);

  const separatorLine = '-'.repeat(28);

  const handleConfirmOrder = async () => {
    onPlaceOrder();
    
    if (restaurant?.id) {
      try {
        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('api_key, configured_printers, browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .single();
          
        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }
        
        const shouldUseBrowserPrinting = printConfig === null || 
                                        printConfig.browser_printing_enabled !== false;
                                        
        if (shouldUseBrowserPrinting) {
          console.log("Using browser printing for receipt");
          setTimeout(() => {
            printReceipt('receipt-content');
          }, 500);
        } else {
          console.log("Browser printing disabled for this restaurant");
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
                tableNumber,
                orderType,
                subtotal,
                tax: tva,
                total
              }
            );
          }
        }
      } catch (error) {
        console.error("Error during receipt printing:", error);
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
    }
  ) => {
    try {
      const receiptContent = generatePrintNodeReceipt(orderData);
      
      const encodedContent = btoa(unescape(encodeURIComponent(receiptContent)));
      
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
  }): string => {
    const { restaurant, cart, orderNumber, tableNumber, orderType, subtotal, tax, total } = orderData;
    const now = new Date();
    const date = now.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const time = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const lineWidth = 32;
    
    const centerText = (text: string) => {
      const padding = Math.max(0, lineWidth - text.length) / 2;
      return ' '.repeat(Math.floor(padding)) + text;
    };
    
    const rightAlignPrice = (label: string, price: string) => {
      const padding = Math.max(0, lineWidth - label.length - price.length);
      return label + ' '.repeat(padding) + price;
    };
    
    const formatItemWithPrice = (item: string, price: string) => {
      return rightAlignPrice(item, price);
    };
    
    let receipt = '';
    
    receipt += centerText(restaurant?.name || 'Restaurant') + '\n';
    if (restaurant?.location) {
      receipt += centerText(restaurant.location) + '\n';
    }
    receipt += centerText(`${date} ${time}`) + '\n';
    receipt += centerText(`Commande #${orderNumber}`) + '\n';
    
    if (orderType === 'takeaway') {
      receipt += centerText('À Emporter') + '\n';
    } else if (orderType === 'dine-in' && tableNumber) {
      receipt += centerText(`Table: ${tableNumber}`) + '\n';
    }
    
    receipt += separatorLine + '\n';
    
    cart.forEach(item => {
      receipt += formatItemWithPrice(
        `${item.quantity}x ${item.menuItem.name}`, 
        `${parseFloat(item.itemPrice.toString()).toFixed(2)} €`
      ) + '\n';
      
      const options = getFormattedOptions(item).split(', ').filter(Boolean);
      options.forEach(option => {
        receipt += `    + ${option}\n`;
      });
      
      const toppings = getFormattedToppings(item).split(', ').filter(Boolean);
      toppings.forEach(topping => {
        receipt += `    + ${topping}\n`;
      });
    });
    
    receipt += separatorLine + '\n';
    
    receipt += rightAlignPrice('Sous-total', `${subtotal.toFixed(2)} €`) + '\n';
    receipt += rightAlignPrice('TVA (10%)', `${tax.toFixed(2)} €`) + '\n';
    receipt += separatorLine + '\n';
    receipt += rightAlignPrice('TOTAL', `${total.toFixed(2)} €`) + '\n';
    
    receipt += separatorLine + '\n';
    
    receipt += '\n' + centerText('Merci de votre visite!') + '\n';
    receipt += centerText('A bientôt!') + '\n';
    
    return receipt;
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
                
                {(getFormattedOptions(item) || getFormattedToppings(item)) && (
                  <div className="pl-6 space-y-1 text-sm text-gray-600">
                    {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                      <div key={`${item.id}-option-${idx}`} className="flex justify-between">
                        <span>+ {option}</span>
                        <span>0.00 €</span>
                      </div>
                    ))}
                    
                    {getFormattedToppings(item).split(', ').filter(Boolean).map((topping, idx) => (
                      <div key={`${item.id}-topping-${idx}`} className="flex justify-between">
                        <span>+ {topping}</span>
                        <span>0.00 €</span>
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
              <span>TVA (10%):</span>
              <span>{tva.toFixed(2)} €</span>
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
        </div>
      </DialogContent>

      <OrderReceipt
        restaurant={restaurant}
        cart={cart}
        orderNumber={orderNumber.toString()}
        tableNumber={tableNumber}
        orderType={orderType}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
      />
    </Dialog>
  );
};

export default OrderSummary;
