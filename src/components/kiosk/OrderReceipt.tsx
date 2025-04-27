
import React from "react";
import { CartItem } from "@/types/database-types";
import { format } from "date-fns";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings } from "@/utils/receipt-templates";
import currencyCodes from "currency-codes";
import { Button } from "@/components/ui/button";

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
    takeaway: "À Emporter",
    newOrder: "Nouvelle Commande"
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
    takeaway: "Takeaway",
    newOrder: "New Order"
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
    takeaway: "Paket Servisi",
    newOrder: "Yeni Sipariş"
  }
};

interface OrderReceiptProps {
  restaurant: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  };
  cart?: CartItem[]; // Made optional
  orderNumber?: string; // Made optional
  tableNumber?: string | null;
  orderType: "dine-in" | "takeaway" | null;
  getFormattedOptions?: (item: CartItem) => string; // Made optional
  getFormattedToppings?: (item: CartItem) => string; // Made optional
  uiLanguage?: "fr" | "en" | "tr";
  onNewOrder?: () => void; // Added this prop
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

/**
 * Sanitizes text to remove emojis for display in receipts
 * This is a browser-side only sanitization for preview purposes
 */
const sanitizeText = (text: string): string => {
  // Remove emojis and other extended Unicode characters that might not display correctly
  return text.replace(/[\u{1F600}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
};

const OrderReceipt: React.FC<OrderReceiptProps> = ({
  restaurant,
  cart = [],
  orderNumber = "12345",
  tableNumber,
  orderType,
  getFormattedOptions = () => "",
  getFormattedToppings = () => "",
  uiLanguage = "fr",
  onNewOrder = () => {},
}) => {
  const { total, subtotal, tax } = calculateCartTotals(cart);
  const currentDate = format(new Date(), "dd/MM/yyyy HH:mm");
  
  const t = (key: keyof typeof translations["en"]) => 
    translations[uiLanguage]?.[key] ?? translations.fr[key];
  
  const currencySymbol = getCurrencySymbol(restaurant.currency || 'EUR');
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-4">{restaurant.name}</h1>
        <p className="text-center text-gray-500">{currentDate}</p>
        
        <div className="my-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-green-600 mb-1">{t("order")} #{orderNumber}</h2>
          <p className="text-gray-600">
            {orderType === "dine-in" ? t("dineIn") : t("takeaway")}
            {orderType === "dine-in" && tableNumber ? ` - ${t("table")} ${tableNumber}` : ""}
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-lg font-medium mb-2">{t("thanks")}</p>
          <p className="text-gray-600">{t("seeYouSoon")}</p>
          
          <Button 
            onClick={onNewOrder} 
            className="mt-8 w-full py-3 text-lg"
          >
            {t("newOrder")}
          </Button>
        </div>
      </div>
      
      {/* Hidden receipt content for printing */}
      <div id="receipt-content" className="receipt" style={{ display: "none" }}>
        <div className="header">
          <div className="logo">{sanitizeText(restaurant.name)}</div>
          {restaurant.location && <div>{sanitizeText(restaurant.location)}</div>}
          <div>{currentDate}</div>
          <div className="order-number">{t("order")} #{orderNumber}</div>
          {orderType === "dine-in" && <div>{t("dineIn")}</div>}
          {orderType === "takeaway" && <div>{t("takeaway")}</div>}
        </div>

        <div className="divider"></div>

        <div>
          {cart.map((item, index) => (
            <div key={item.id} style={{ marginBottom: "8px" }}>
              <div className="item">
                <span>{item.quantity}x {sanitizeText(item.menuItem.name)}</span>
                <span>{parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}</span>
              </div>
              {(getFormattedOptions(item) || getFormattedToppings(item)) && (
                <div className="item-details text-xs">
                  {/* Options */}
                  {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => (
                    <div key={`${item.id}-option-${idx}`} className="item">
                      <span>+ {sanitizeText(option)}</span>
                      <span></span>
                    </div>
                  ))}
                  {/* Grouped toppings by category, show price if > 0 */}
                  {getGroupedToppings(item).map((group, groupIdx) => (
                    <div key={`${item.id}-cat-${groupIdx}`}>
                      <div style={{ fontWeight: 600, paddingLeft: 0 }}>{sanitizeText(group.category)}:</div>
                      {group.toppings.map((topping, topIdx) => {
                        const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                        const toppingRef = category?.toppings.find(t => t.name === topping);
                        const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                        return (
                          <div key={`${item.id}-cat-${groupIdx}-topping-${topIdx}`} className="item">
                            <span style={{ paddingLeft: 6 }}>+ {sanitizeText(topping)}</span>
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
    </div>
  );
};

export default OrderReceipt;
