
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, ArrowRight, Loader2, Plus, Minus, Trash2, ChevronDown, X } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderSummary from "./OrderSummary";

interface CartProps {
  cart: CartItem[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onPlaceOrder: () => void;
  placingOrder: boolean;
  orderPlaced: boolean;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
}

const Cart: React.FC<CartProps> = ({
  cart,
  isOpen,
  onToggleOpen,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onPlaceOrder,
  placingOrder,
  orderPlaced,
  calculateSubtotal,
  calculateTax,
  getFormattedOptions,
  getFormattedToppings,
}) => {
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleShowOrderSummary = () => {
    setShowOrderSummary(true);
  };

  const handleCloseOrderSummary = () => {
    setShowOrderSummary(false);
  };

  const handlePlaceOrder = () => {
    onPlaceOrder();
    setShowOrderSummary(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" style={{ maxHeight: "80vh" }}>
        <div className="w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center">
              <h2 className="text-xl font-bold">VOTRE COMMANDE ({cartItemCount})</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onToggleOpen}>
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-4 overflow-auto" style={{ maxHeight: "40vh" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cart.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 relative">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1 top-1 text-red-500 h-7 w-7" 
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex items-start space-x-3">
                    <img 
                      src={item.menuItem.image || '/placeholder.svg'} 
                      alt={item.menuItem.name} 
                      className="w-16 h-16 object-cover rounded" 
                    />
                    <div className="flex flex-col">
                      <h3 className="font-bold">{item.menuItem.name}</h3>
                      <p className="text-gray-700 font-medium">
                        {parseFloat(item.itemPrice.toString()).toFixed(2)} €
                      </p>
                      
                      <div className="flex items-center mt-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 rounded-full p-0" 
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-7 w-7 rounded-full p-0" 
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total:</span>
                <span className="font-medium">{calculateSubtotal().toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA (10%):</span>
                <span className="font-medium">{calculateTax().toFixed(2)} €</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span>{(calculateSubtotal() + calculateTax()).toFixed(2)} €</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <Button variant="destructive" className="py-6" onClick={onClearCart}>
                ANNULER
              </Button>
              <Button 
                className="bg-green-800 hover:bg-green-900 text-white py-6"
                onClick={handleShowOrderSummary}
                disabled={placingOrder || orderPlaced || cart.length === 0}
              >
                {placingOrder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {orderPlaced && <Check className="h-4 w-4 mr-2" />}
                {orderPlaced ? "CONFIRMÉ" : placingOrder ? "EN COURS..." : "VOIR MA COMMANDE"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OrderSummary
        isOpen={showOrderSummary}
        onClose={handleCloseOrderSummary}
        cart={cart}
        onPlaceOrder={handlePlaceOrder}
        placingOrder={placingOrder}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        getFormattedOptions={getFormattedOptions}
        getFormattedToppings={getFormattedToppings}
      />
    </>
  );
};

export default Cart;
