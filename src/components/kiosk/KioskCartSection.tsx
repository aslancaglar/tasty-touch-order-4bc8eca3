
import React from "react";
import Cart from "@/components/kiosk/Cart";
import CartButton from "@/components/kiosk/CartButton";
import { CartItem, OrderType, Restaurant } from "@/types/database-types";

interface KioskCartSectionProps {
  cart: CartItem[];
  isCartOpen: boolean;
  toggleCart: () => void;
  handleUpdateCartItemQuantity: (itemId: string, newQuantity: number) => void;
  handleRemoveCartItem: (itemId: string) => void;
  handlePlaceOrder: () => void;
  placingOrder: boolean;
  orderPlaced: boolean;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  clearCart: () => void;
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber: string | null;
  uiLanguage: "fr" | "en" | "tr";
  t: (key: string) => string;
  cartRef: React.RefObject<HTMLDivElement>;
  cartTotal: number;
}

const KioskCartSection: React.FC<KioskCartSectionProps> = ({ 
  cart, 
  isCartOpen, 
  toggleCart, 
  handleUpdateCartItemQuantity, 
  handleRemoveCartItem, 
  handlePlaceOrder,
  placingOrder, 
  orderPlaced, 
  calculateSubtotal, 
  calculateTax, 
  getFormattedOptions, 
  getFormattedToppings, 
  clearCart,
  restaurant, 
  orderType, 
  tableNumber, 
  uiLanguage, 
  t,
  cartRef,
  cartTotal 
}) => {
  const cartIsEmpty = cart.length === 0;
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <>
      {!isCartOpen && !cartIsEmpty && (
        <CartButton 
          itemCount={cartItemCount} 
          total={cartTotal} 
          onClick={toggleCart} 
          uiLanguage={uiLanguage} 
          currency={restaurant.currency} 
        />
      )}

      <div 
        ref={cartRef} 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" 
        style={{ maxHeight: "60vh" }}
      >
        <Cart 
          cart={cart} 
          isOpen={isCartOpen} 
          onToggleOpen={toggleCart} 
          onUpdateQuantity={handleUpdateCartItemQuantity} 
          onRemoveItem={handleRemoveCartItem} 
          onClearCart={clearCart} 
          onPlaceOrder={handlePlaceOrder} 
          placingOrder={placingOrder} 
          orderPlaced={orderPlaced} 
          calculateSubtotal={calculateSubtotal} 
          calculateTax={calculateTax} 
          getFormattedOptions={getFormattedOptions} 
          getFormattedToppings={getFormattedToppings} 
          restaurant={restaurant} 
          orderType={orderType} 
          tableNumber={tableNumber} 
          uiLanguage={uiLanguage} 
          t={t} 
        />
      </div>
    </>
  );
};

export default KioskCartSection;
