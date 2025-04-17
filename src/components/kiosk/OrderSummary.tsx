import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "./OrderReceipt";
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
  const subtotal = calculateSubtotal();
  const tax = calculateTax();
  const total = subtotal + tax;
  
  // Generate a unique order number
  const orderNumber = Date.now().toString().slice(-6); // Simple order number generation

  const handleConfirmOrder = async () => {
    onPlaceOrder();
    
    // After order is placed successfully, print receipt
    if (restaurant?.id) {
      try {
        // Check if PrintNode is configured for this restaurant
        const { data: printConfig, error } = await supabase
          .from('restaurant_print_config')
          .select('api_key, configured_printers, browser_printing_enabled')
          .eq('restaurant_id', restaurant.id)
          .single();
          
        if (error) {
          console.error("Error fetching print configuration:", error);
          return;
        }
        
        // Print receipt via browser printing if enabled or if no PrintNode config
        if (printConfig?.browser_printing_enabled || !printConfig?.api_key) {
          // Wait a bit to ensure content is rendered
          setTimeout(() => {
            printReceipt('receipt-content');
          }, 500);
        }
        
        // If PrintNode is configured and there are selected printers, send to PrintNode
        if (printConfig?.api_key && printConfig?.configured_printers) {
          const printerArray = Array.isArray(printConfig.configured_printers) 
            ? printConfig.configured_printers 
            : [];
            
          // Convert any non-string printer IDs to strings
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
                tax,
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
  
  // Function to send receipt to PrintNode
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
      // Create the receipt content as raw text for thermal printer
      const receiptContent = generatePrintNodeReceipt(orderData);
      
      // Properly encode the receipt content for PrintNode - fix for non-Latin1 characters
      const encodedContent = btoa(unescape(encodeURIComponent(receiptContent)));
      
      console.log("Sending receipt to PrintNode printers:", printerIds);
      
      // Send to each configured printer
      for (const printerId of printerIds) {
        console.log(`Sending to printer ID: ${printerId}`);
        
        const response = await fetch('https://api.printnode.com/printjobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(apiKey + ':')}`
          },
          body: JSON.stringify({
            printer: parseInt(printerId, 10) || printerId, // Handle numeric IDs
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
  
  // Generate plain text receipt for PrintNode
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
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    
    // Helper function to center text in a line of specified width
    const centerText = (text: string, width: number = 40) => {
      const padding = Math.max(0, width - text.length) / 2;
      return ' '.repeat(Math.floor(padding)) + text + ' '.repeat(Math.ceil(padding));
    };
    
    // Helper function to align text left and right in a line
    const alignLeftRight = (left: string, right: string, width: number = 40) => {
      const padding = Math.max(0, width - left.length - right.length);
      return left + ' '.repeat(padding) + right;
    };
    
    let receipt = '';
    
    // Header
    receipt += centerText(restaurant?.name || 'Restaurant') + '\n';
    if (restaurant?.location) {
      receipt += centerText(restaurant.location) + '\n';
    }
    receipt += centerText(`${date} ${time}`) + '\n';
    receipt += centerText(`Order #${orderNumber}`) + '\n';
    
    if (orderType === 'dine-in' && tableNumber) {
      receipt += centerText(`Table: ${tableNumber}`) + '\n';
    } else if (orderType === 'takeaway') {
      receipt += centerText('TAKEAWAY') + '\n';
    }
    
    receipt += '\n' + '-'.repeat(40) + '\n\n';
    
    // Items
    cart.forEach(item => {
      receipt += alignLeftRight(
        `${item.quantity}x ${item.menuItem.name}`, 
        `${parseFloat(item.itemPrice.toString()).toFixed(2)} €`
      ) + '\n';
      
      // Options
      const options = getFormattedOptions(item).split(', ').filter(Boolean);
      options.forEach(option => {
        receipt += alignLeftRight(`  + ${option}`, '') + '\n';
      });
      
      // Toppings
      const toppings = getFormattedToppings(item).split(', ').filter(Boolean);
      toppings.forEach(topping => {
        receipt += alignLeftRight(`  + ${topping}`, '') + '\n';
      });
      
      if (options.length > 0 || toppings.length > 0) {
        receipt += '\n';
      }
    });
    
    receipt += '\n' + '-'.repeat(40) + '\n\n';
    
    // Totals
    receipt += alignLeftRight('Subtotal:', `${subtotal.toFixed(2)} €`) + '\n';
    receipt += alignLeftRight('TVA (10%):', `${tax.toFixed(2)} €`) + '\n';
    receipt += '\n';
    receipt += alignLeftRight('TOTAL:', `${total.toFixed(2)} €`) + '\n';
    
    receipt += '\n' + '-'.repeat(40) + '\n\n';
    
    // Footer
    receipt += centerText('Thank you for your order!') + '\n';
    receipt += centerText('Please come again!') + '\n';
    
    // Add extra space at the end for paper cutting
    receipt += '\n\n\n\n';
    
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
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>TVA (10%)</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
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

      {/* Hidden receipt that will be used for printing */}
      <OrderReceipt
        restaurant={restaurant}
        cart={cart}
        orderNumber={orderNumber}
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
