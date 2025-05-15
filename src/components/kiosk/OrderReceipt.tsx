
import React from "react";
import { CartItem } from "@/types/database-types";
import { format } from "date-fns";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings, ToppingWithQuantity } from "@/utils/receipt-templates";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  TRY: "₺",
  JPY: "¥",
  CAD: "$",
  AUD: "$",
  CHF: "Fr.",
  CNY: "¥",
  RUB: "₽"
};

const getCurrencySymbol = (currencyCode: string): string => {
  const code = (currencyCode || "EUR").toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Sanitizes text to remove emojis for display in receipts
 * This is a browser-side only sanitization for preview purposes
 */
const sanitizeText = (text: string): string => {
  // Remove emojis and other extended Unicode characters that might not display correctly
  return text.replace(/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
};

interface OrderReceiptProps {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  };
  cart: CartItem[];
  orderNumber: string;
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  uiLanguage?: SupportedLanguage;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({
  restaurant,
  cart,
  orderNumber,
  tableNumber,
  orderType,
  getFormattedOptions,
  getFormattedToppings,
  uiLanguage = "fr",
}) => {
  const { total, subtotal, tax } = calculateCartTotals(cart);
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm");
  
  const { t } = useTranslation(uiLanguage);
  
  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');
  
  return (
    <div id="receipt-content" className="receipt" style={{ display: "none" }}>
      <div className="header">
        <div className="logo">{sanitizeText(restaurant.name)}</div>
        {restaurant.location && <div>{sanitizeText(restaurant.location)}</div>}
        <div>{currentDate}</div>
        <div className="order-number-container" style={{ backgroundColor: "#000", padding: "4px 8px", marginTop: "5px", marginBottom: "5px" }}>
          <div className="order-number" style={{ color: "#fff", fontSize: "2em", fontWeight: "bold" }}>
            {t("receipt.order")} #{orderNumber}
          </div>
        </div>
        {orderType === "dine-in" && <div>{t("receipt.dineIn")}</div>}
        {orderType === "takeaway" && <div>{t("receipt.takeaway")}</div>}
        {tableNumber && <div>{t("receipt.table")} #{tableNumber}</div>}
      </div>

      <div className="divider"></div>

      <div>
        {cart.map((item, index) => (
          <div key={item.id} style={{ marginBottom: "8px" }}>
            <div className="item">
              <span>{item.quantity}x {sanitizeText(item.menuItem.name)}</span>
              <span>{parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}</span>
            </div>
            {getFormattedOptions(item) && (
              <div className="item-details text-xs">
                {/* Options */}
                {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                  <div key={`${item.id}-option-${idx}`} className="item">
                    <span>+ {sanitizeText(option)}</span>
                    <span></span>
                  </div>
                ))}
              </div>
            )}
            {/* Add toppings with minimized spacing */}
            {item.selectedToppings && item.selectedToppings.length > 0 && (
              <div className="item-details text-xs" style={{ marginTop: "0", lineHeight: "1.0" }}>
                {getGroupedToppings(item).flatMap((group) => 
                  group.toppings.map((topping, toppingIdx) => {
                    const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                    
                    // Handle either string or ToppingWithQuantity
                    const toppingName = typeof topping === 'string' ? topping : topping.name;
                    const quantity = typeof topping === 'object' ? topping.quantity : 1;
                    
                    const toppingObj = category?.toppings.find(t => t.name === toppingName);
                    const price = toppingObj ? parseFloat(String(toppingObj.price ?? "0")) : 0;
                    
                    // Calculate total price based on quantity
                    const totalPrice = price * quantity;
                    
                    return (
                      <div key={`${item.id}-topping-${toppingIdx}`} className="item" style={{ marginBottom: "0", paddingTop: "0" }}>
                        <span>
                          {quantity > 1 ? `+ ${quantity}x ${sanitizeText(toppingName)}` : `+ ${sanitizeText(toppingName)}`}
                        </span>
                        {totalPrice > 0 && <span>{totalPrice.toFixed(2)} {currencySymbol}</span>}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {item.specialInstructions && (
              <div className="item-details text-xs">
                <div>{t('receipt.specialInstructions')}: {sanitizeText(item.specialInstructions)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="divider"></div>

      <div className="total-section">
        <div className="total-line">
          <span>{t("receipt.subtotal")}</span>
          <span>{subtotal.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="total-line">
          <span>{t("receipt.vat")}</span>
          <span>{tax.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="divider"></div>
        <div className="total-line grand-total">
          <span>{t("receipt.total")}</span>
          <span>{total.toFixed(2)} {currencySymbol}</span>
        </div>
      </div>

      <div className="footer">
        <p>{t("receipt.thanks")}</p>
        <p>{t("receipt.seeYouSoon")}</p>
      </div>
    </div>
  );
};

export default OrderReceipt;
