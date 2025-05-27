
import React from "react";
import { CartItem } from "@/types/database-types";
import { getGroupedToppings, ToppingWithQuantity } from "@/utils/receipt-templates";

interface OrderItemProps {
  item: CartItem;
  getFormattedOptions: (item: CartItem) => string;
}

const OrderItem: React.FC<OrderItemProps> = ({ item, getFormattedOptions }) => {
  // Helper to get topping name whether it's a string or ToppingWithQuantity
  const getToppingDisplayName = (topping: string | ToppingWithQuantity): string => {
    if (typeof topping === 'object') {
      return topping.name;
    }
    return topping;
  };

  // Helper to get topping quantity
  const getToppingQuantity = (topping: string | ToppingWithQuantity): number => {
    if (typeof topping === 'object') {
      return topping.quantity;
    }
    return 1;
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="flex items-center">
          <span className="font-medium mr-2">{item.quantity}x</span>
          <span className="font-medium">{item.menuItem.name}</span>
        </div>
        <span className="font-medium">{parseFloat(item.itemPrice.toString()).toFixed(2)} €</span>
      </div>
      
      {(getFormattedOptions(item) || (item.selectedToppings?.length > 0)) && (
        <div className="pl-6 space-y-1 text-sm text-gray-600">
          {/* Options */}
          {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
            <div key={`${item.id}-option-${idx}`} className="flex justify-between">
              <span>+ {option}</span>
              <span>0.00 €</span>
            </div>
          ))}
          {/* Grouped toppings by category, show price if > 0 */}
          {getGroupedToppings(item).map((group, groupIdx) => (
            <div key={`${item.id}-cat-summary-${groupIdx}`}>
              <div style={{ fontWeight: 500, paddingLeft: 0 }}>{group.category}:</div>
              {group.toppings.map((toppingObj, topIdx) => {
                const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                
                // Get display name and quantity
                const displayName = getToppingDisplayName(toppingObj);
                const quantity = getToppingQuantity(toppingObj);
                
                const toppingRef = category?.toppings.find(t => t.name === displayName);
                const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                
                // Calculate total price based on quantity
                const totalPrice = price * quantity;
                
                return (
                  <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between">
                    <span style={{ paddingLeft: 6 }}>
                      {quantity > 1 ? `+ ${quantity}x ${displayName}` : `+ ${displayName}`}
                    </span>
                    <span>{totalPrice > 0 ? totalPrice.toFixed(2) + " €" : ""}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderItem;
