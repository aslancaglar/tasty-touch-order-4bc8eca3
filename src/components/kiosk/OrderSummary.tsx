
import React from "react";
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
  
  const handleConfirmOrder = async () => {
    // First send to PrintNode printers if configured
    if (restaurant && restaurant.id) {
      try {
        // Get restaurant print config
        const { data: printConfig } = await supabase
          .from('restaurant_print_config')
          .select('api_key, configured_printers')
          .eq('restaurant_id', restaurant.id)
          .single();
          
        if (printConfig && printConfig.api_key && printConfig.configured_printers && printConfig.configured_printers.length > 0) {
          // Get browser printing configuration
          const { data: browserPrintConfig } = await supabase
            .from('restaurant_print_config')
            .select('browser_printing_enabled')
            .eq('restaurant_id', restaurant.id)
            .single();
          
          const browserPrintingEnabled = browserPrintConfig?.browser_printing_enabled !== false;
          
          // Generate order data for receipt
          const orderNumber = Date.now().toString().slice(-6);
          const receiptData = {
            restaurant: restaurant,
            orderNumber: orderNumber,
            tableNumber: tableNumber,
            orderType: orderType,
            items: cart.map(item => ({
              name: item.menuItem.name,
              quantity: item.quantity,
              price: item.itemPrice,
              options: getFormattedOptions(item).split(', ').filter(Boolean),
              toppings: getFormattedToppings(item).split(', ').filter(Boolean)
            })),
            subtotal: subtotal,
            tax: tax,
            total: total,
            date: new Date().toLocaleString()
          };
          
          // Print to PrintNode printers
          for (const printerId of printConfig.configured_printers) {
            await sendToPrintNode(printerId, receiptData, printConfig.api_key);
          }
          
          // Also print via browser if enabled
          if (browserPrintingEnabled) {
            printReceipt("receipt-content");
          }
        } else {
          // Fallback to browser printing if PrintNode is not configured
          printReceipt("receipt-content");
        }
      } catch (error) {
        console.error("Error printing receipt:", error);
        // Fallback to browser printing on error
        printReceipt("receipt-content");
      }
    }
    
    // Continue with placing the order
    onPlaceOrder();
  };

  const sendToPrintNode = async (printerId: string, receiptData: any, apiKey: string) => {
    try {
      // Format the receipt for thermal printer
      const formattedReceipt = {
        title: `Order #${receiptData.orderNumber}`,
        content: [
          { type: "text", value: receiptData.restaurant.name, style: "header" },
          { type: "text", value: receiptData.restaurant.location || "", style: "normal" },
          { type: "text", value: receiptData.date, style: "normal" },
          { type: "text", value: `Order #${receiptData.orderNumber}`, style: "bold" },
          { type: "text", value: receiptData.orderType === "dine-in" ? `Table: ${receiptData.tableNumber}` : "Takeaway", style: "normal" },
          { type: "divider" },
          ...receiptData.items.flatMap(item => [
            { type: "text", value: `${item.quantity}x ${item.name}`, style: "bold" },
            { type: "text", value: `${item.price.toFixed(2)} €`, style: "normal", align: "right" },
            ...item.options.map(option => ({ type: "text", value: `+ ${option}`, style: "small" })),
            ...item.toppings.map(topping => ({ type: "text", value: `+ ${topping}`, style: "small" }))
          ]),
          { type: "divider" },
          { type: "text", value: `Subtotal: ${receiptData.subtotal.toFixed(2)} €`, style: "normal" },
          { type: "text", value: `Tax (10%): ${receiptData.tax.toFixed(2)} €`, style: "normal" },
          { type: "text", value: `Total: ${receiptData.total.toFixed(2)} €`, style: "bold" },
          { type: "divider" },
          { type: "text", value: "Thank you for your order!", style: "normal", align: "center" }
        ]
      };

      // Send to PrintNode API
      const response = await fetch('https://api.printnode.com/printjobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(apiKey + ':')}`
        },
        body: JSON.stringify({
          printer: printerId,
          title: `Order #${receiptData.orderNumber}`,
          contentType: "raw_base64",
          content: btoa(JSON.stringify(formattedReceipt)),
          source: "Restaurant Kiosk"
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending print job: ${response.status}`);
      }
      
      console.log(`Receipt sent to PrintNode printer ${printerId}`);
    } catch (error) {
      console.error("Error sending to PrintNode:", error);
      // Continue with order even if printing fails
    }
  };

  const orderNumber = Date.now().toString().slice(-6); // Simple order number generation

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
