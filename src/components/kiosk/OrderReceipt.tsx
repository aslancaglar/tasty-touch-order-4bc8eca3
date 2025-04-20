
import React from "react";
import { CartItem } from "@/types/database-types";
import { format } from "date-fns";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings } from "@/utils/receipt-templates";

interface OrderReceiptProps {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
  };
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({
  restaurant,
  cart,
  orderNumber,
  tableNumber,
  orderType,
  getFormattedOptions,
  getFormattedToppings,
}) => {
  const { total, subtotal, tax } = calculateCartTotals(cart);
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm");
  
  return (
    <div id="receipt-content" className="receipt" style={{ display: "none" }}>
      <div className="header">
        <div className="logo">{restaurant.name}</div>
        {restaurant.location && <div>{restaurant.location}</div>}
        <div>{currentDate}</div>
        <div>Commande #{orderNumber}</div>
        {orderType === "dine-in" && tableNumber && <div>Table: {tableNumber}</div>}
        {orderType === "takeaway" && <div>À Emporter</div>}
      </div>

      <div className="divider"></div>

      <div>
        {cart.map((item, index) => (
          <div key={item.id} style={{ marginBottom: "8px" }}>
            <div className="item">
              <span>{item.quantity}x {item.menuItem.name}</span>
              <span>{parseFloat(item.itemPrice.toString()).toFixed(2)} €</span>
            </div>
            
            {(getFormattedOptions(item) || getFormattedToppings(item)) && (
              <div className="item-details text-xs">
                {/* Options */}
                {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                  <div key={`${item.id}-option-${idx}`} className="item">
                    <span>+ {option}</span>
                    <span></span>
                  </div>
                ))}

                {/* Grouped toppings by category */}
                {getGroupedToppings(item).map((group, groupIdx) => (
                  <div key={`${item.id}-cat-${groupIdx}`}>
                    <div style={{ fontWeight: 500, paddingLeft: 0 }}>{group.category}:</div>
                    {group.toppings.map((topping, topIdx) => (
                      <div key={`${item.id}-cat-${groupIdx}-topping-${topIdx}`} className="item">
                        <span style={{ paddingLeft: 6 }}>+ {topping}</span>
                        <span></span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="divider"></div>

      <div className="total-section">
        <div className="total-line">
          <span>Sous-total</span>
          <span>{subtotal.toFixed(2)} €</span>
        </div>
        <div className="total-line">
          <span>TVA</span>
          <span>{tax.toFixed(2)} €</span>
        </div>
        <div className="divider"></div>
        <div className="total-line grand-total">
          <span>TOTAL</span>
          <span>{total.toFixed(2)} €</span>
        </div>
      </div>

      <div className="footer">
        <p>Merci de votre visite!</p>
        <p>A bientôt!</p>
      </div>
    </div>
  );
};

export default OrderReceipt;
