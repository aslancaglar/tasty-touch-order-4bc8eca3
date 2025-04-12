
import React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, ArrowRight, Loader2, Plus, Minus, Trash2, ChevronDown } from "lucide-react";
import { CartItem } from "@/types/database-types";

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
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" style={{ maxHeight: "80vh" }}>
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <h2 className="text-xl font-bold">VOTRE COMMANDE ({cartItemCount})</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleOpen}>
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 overflow-auto" style={{ maxHeight: "40vh" }}>
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-start">
                <img 
                  src={item.menuItem.image || '/placeholder.svg'} 
                  alt={item.menuItem.name} 
                  className="w-16 h-16 object-cover rounded mr-4" 
                />
                <div>
                  <h3 className="font-bold">{item.menuItem.name}</h3>
                  <div className="text-sm text-gray-500">
                    {getFormattedOptions(item)}
                    {getFormattedOptions(item) && getFormattedToppings(item) && ", "}
                    {getFormattedToppings(item)}
                  </div>
                  <p className="text-gray-700 font-medium mt-1">
                    {parseFloat(item.itemPrice.toString()).toFixed(2)} €
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full" 
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 rounded-full" 
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-2 text-red-500" 
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
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
              onClick={onPlaceOrder} 
              disabled={placingOrder || orderPlaced}
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
  );
};

export default Cart;
