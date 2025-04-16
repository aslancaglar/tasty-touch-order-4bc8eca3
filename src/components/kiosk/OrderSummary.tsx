
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderReceipt from "./OrderReceipt";
import { printReceipt } from "@/utils/print-utils";

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
  
  const handleConfirmOrder = () => {
    onPlaceOrder();
    // We'll let the onPlaceOrder function handle what happens after order is placed
    // This fixes the issue with multiple popups
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
