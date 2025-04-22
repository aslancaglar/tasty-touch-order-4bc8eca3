import React from "react";
import { CartItem } from "@/types/database-types";
import { format } from "date-fns";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings } from "@/utils/receipt-templates";
import currencyCodes from "currency-codes";

const translations = {
  fr: {
    order: "Commande",
    table: "Table",
    subtotal: "Sous-total",
    vat: "TVA",
    total: "TOTAL",
    thanks: "Merci de votre visite!",
    seeYouSoon: "A bientôt!",
    dineIn: "Sur Place",
    takeaway: "À Emporter"
  },
  en: {
    order: "Order",
    table: "Table",
    subtotal: "Subtotal",
    vat: "VAT",
    total: "TOTAL",
    thanks: "Thank you for your visit!",
    seeYouSoon: "See you soon!",
    dineIn: "Dine In",
    takeaway: "Takeaway"
  },
  tr: {
    order: "Sipariş",
    table: "Masa",
    subtotal: "Ara Toplam",
    vat: "KDV",
    total: "TOPLAM",
    thanks: "Ziyaretiniz için teşekkürler!",
    seeYouSoon: "Tekrar görüşmek üzere!",
    dineIn: "Yemek İçin",
    takeaway: "Paket Servisi"
  }
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
  uiLanguage?: "fr" | "en" | "tr";
}

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
  
  const t = (key: keyof typeof translations["en"]) => 
    translations[uiLanguage]?.[key] ?? translations.fr[key];
  
  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');
  
  return (
    <div id="receipt-content" className="receipt" style={{ display: "none" }}>
      <div className="header">
        <div className="logo">{restaurant.name}</div>
        {restaurant.location && <div>{restaurant.location}</div>}
        <div>{currentDate}</div>
        <div>{t("order")} #{orderNumber}</div>
        {orderType === "dine-in" && <div>{t("dineIn")}</div>}
        {orderType === "takeaway" && <div>{t("takeaway")}</div>}
      </div>

      <div className="divider"></div>

      <div>
        {cart.map((item, index) => (
          <div key={item.id} style={{ marginBottom: "8px" }}>
            <div className="item">
              <span>{item.quantity}x {item.menuItem.name}</span>
              <span>{parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}</span>
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
                {/* Grouped toppings by category, show price if > 0 */}
                {getGroupedToppings(item).map((group, groupIdx) => (
                  <div key={`${item.id}-cat-${groupIdx}`}>
                    <div style={{ fontWeight: 500, paddingLeft: 0 }}>{group.category}:</div>
                    {group.toppings.map((topping, topIdx) => {
                      const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                      const toppingRef = category?.toppings.find(t => t.name === topping);
                      const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                      return (
                        <div key={`${item.id}-cat-${groupIdx}-topping-${topIdx}`} className="item">
                          <span style={{ paddingLeft: 6 }}>+ {topping}</span>
                          <span>{price > 0 ? price.toFixed(2) + " " + currencySymbol : ""}</span>
                        </div>
                      )
                    })}
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
          <span>{t("subtotal")}</span>
          <span>{subtotal.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="total-line">
          <span>{t("vat")}</span>
          <span>{tax.toFixed(2)} {currencySymbol}</span>
        </div>
        <div className="divider"></div>
        <div className="total-line grand-total">
          <span>{t("total")}</span>
          <span>{total.toFixed(2)} {currencySymbol}</span>
        </div>
      </div>

      <div className="footer">
        <p>{t("thanks")}</p>
        <p>{t("seeYouSoon")}</p>
      </div>
    </div>
  );
};

export default OrderReceipt;
