import React, { useState } from 'react';
import { ShoppingCart, X, Minus, Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem, Restaurant, OrderType } from '@/types/database-types';
import { formatCurrency } from '@/utils/price-utils';
import TableSelection from './TableSelection';
import OrderReceipt from './OrderReceipt';
import OrderSummary from './OrderSummary';

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
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber: string | null;
  uiLanguage: "fr" | "en" | "tr";
  t: (key: string) => string;
}

const Cart = ({
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
  restaurant,
  orderType,
  tableNumber,
  uiLanguage,
  t
}: CartProps) => {
  const [showTableSelection, setShowTableSelection] = useState(false);
  const [showOrderReceipt, setShowOrderReceipt] = useState(false);
  const currencySymbol = restaurant ? (restaurant.currency === "EUR" ? "€" : "$") : "€";

  const handleToggleTableSelection = () => {
    setShowTableSelection(!showTableSelection);
  };

  const handleToggleOrderReceipt = () => {
    setShowOrderReceipt(!showOrderReceipt);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg" style={{ maxHeight: "60vh" }}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <ShoppingCart className="mr-2 h-5 w-5" />
          <h2 className="text-lg font-semibold">{t("cart.title")}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleOpen}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="text-center text-gray-500">{t("cart.empty")}</div>
        ) : (
          <ul>
            {cart.map((item) => (
              <li key={item.id} className="mb-4 border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{item.menuItem.name}</div>
                    {getFormattedOptions(item) && (
                      <div className="text-sm text-gray-500">
                        {getFormattedOptions(item)}
                      </div>
                    )}
                    {getFormattedToppings(item) && (
                      <div className="text-sm text-gray-500">
                        {getFormattedToppings(item)}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="text-sm text-gray-500 italic">
                        {item.specialInstructions}
                      </div>
                    )}
                    <div className="text-gray-600">
                      {formatCurrency(item.itemPrice, currencySymbol)}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="mx-2">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <OrderSummary
        cart={cart}
        calculateSubtotal={calculateSubtotal}
        calculateTax={calculateTax}
        restaurant={restaurant}
        t={t}
        currencySymbol={currencySymbol}
      />

      {orderType === "dine-in" && (
        <div className="p-4">
          {tableNumber ? (
            <div className="text-center text-green-500">
              {t("cart.tableNumber")}: {tableNumber}
            </div>
          ) : (
            <TableSelection />
          )}
        </div>
      )}

      <div className="p-4">
        <Button
          className="w-full"
          onClick={onPlaceOrder}
          disabled={placingOrder || orderPlaced}
        >
          {placingOrder ? (
            <>
              {t("cart.placingOrder")}
            </>
          ) : orderPlaced ? (
            t("cart.orderPlaced")
          ) : (
            <>
              {t("cart.placeOrder")} ({formatCurrency(calculateSubtotal() + calculateTax(), currencySymbol)})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
