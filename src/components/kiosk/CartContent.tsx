
import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';

const CartContent: React.FC = () => {
  const { cartItems, updateCartItem, removeFromCart, clearCart } = useCart();
  const { restaurant } = useRestaurant();
  
  const getCurrencySymbol = (currencyCode?: string) => {
    const code = currencyCode?.toUpperCase() || "EUR";
    const symbols: Record<string, string> = {
      EUR: "€",
      USD: "$",
      GBP: "£",
      JPY: "¥",
      CAD: "$",
      AUD: "$",
      // Add more currencies as needed
    };
    return symbols[code] || code;
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.itemPrice * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return <div className="py-6 text-center text-muted-foreground">Your cart is empty</div>;
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[400px] overflow-auto">
        {cartItems.map((item) => (
          <div key={item.id} className="py-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{item.menuItem.name}</p>
                <div className="text-sm text-muted-foreground">
                  {item.specialInstructions && (
                    <p className="italic">"{item.specialInstructions}"</p>
                  )}
                </div>
                <div className="flex items-center mt-1 space-x-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => {
                      if (item.quantity > 1) {
                        updateCartItem(item.id, { ...item, quantity: item.quantity - 1 });
                      }
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span>{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7"
                    onClick={() => updateCartItem(item.id, { ...item, quantity: item.quantity + 1 })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-red-500"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <p>
                  {getCurrencySymbol(restaurant?.currency)}
                  {(item.itemPrice * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
            <Separator className="mt-2" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>
            {getCurrencySymbol(restaurant?.currency)}
            {totalAmount.toFixed(2)}
          </span>
        </div>
        <Button className="w-full bg-kiosk-primary">
          Proceed to Checkout
        </Button>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={clearCart}
        >
          Clear Cart
        </Button>
      </div>
    </div>
  );
};

export default CartContent;
