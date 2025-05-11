
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings } from "@/utils/receipt-templates";
import { ScrollArea } from "@/components/ui/scroll-area";
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

function getCurrencySymbol(currency: string) {
  return CURRENCY_SYMBOLS[(currency || "EUR").toUpperCase()] || (currency || "EUR").toUpperCase();
}

interface OrderSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onPlaceOrder: () => void;
  placingOrder: boolean;
  calculateSubtotal: () => number;
  calculateTax: () => number;
  getFormattedOptions: (item: CartItem) => string;
  getFormattedToppings: (item: CartItem) => string;
  restaurant?: {
    id?: string;
    name: string;
    location?: string;
    currency?: string;
  } | null;
  orderType?: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  uiLanguage?: SupportedLanguage;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  isOpen,
  onClose,
  cart,
  onPlaceOrder,
  placingOrder,
  getFormattedOptions,
  getFormattedToppings,
  restaurant = {
    name: "Restaurant"
  },
  uiLanguage = "fr"
}) => {
  const {
    t
  } = useTranslation(uiLanguage);
  const {
    total,
    subtotal,
    tax
  } = calculateCartTotals(cart);
  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");
  const handleConfirmOrder = async () => {
    // Simply call onPlaceOrder and let the parent component handle the rest
    onPlaceOrder();
  };
  
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-2xl p-0 max-h-[80vh] flex flex-col">
        {/* Fixed Header - shrink-0 ensures it doesn't shrink */}
        <div className="p-4 border-b flex items-center space-x-2 shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">{t("order.summary")}</h2>
        </div>
        
        {/* Scrollable Content Area */}
        <ScrollArea className="flex-grow overflow-y-auto">
          <div className="p-6">
            <h3 className="font-bold text-lg mb-4">{t("order.items")}</h3>
            
            <div className="space-y-6 mb-6">
              {cart.map(item => <div key={item.id} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">{item.quantity}x</span>
                      <span className="font-medium">{item.menuItem.name}</span>
                    </div>
                    <span className="font-medium">{parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}</span>
                  </div>
                  
                  {(getFormattedOptions(item) || item.selectedToppings?.length > 0) && <div className="pl-6 space-y-1 text-sm text-gray-600">
                      {/* Options */}
                      {getFormattedOptions(item).split(', ').filter(Boolean).map((option, idx) => <div key={`${item.id}-option-${idx}`} className="flex justify-between">
                          <span>+ {option}</span>
                          <span>0.00 {currencySymbol}</span>
                        </div>)}
                      {/* Grouped toppings by category, show price if > 0 */}
                      {getGroupedToppings(item).map((group, groupIdx) => <div key={`${item.id}-cat-summary-${groupIdx}`}>
                          <div style={{
                    fontWeight: 500,
                    paddingLeft: 0
                  }}>{group.category}:</div>
                          {group.toppings.map((toppingObj, topIdx) => {
                    const category = item.menuItem.toppingCategories?.find(cat => cat.name === group.category);
                    const toppingRef = category?.toppings.find(t => t.name === toppingObj);
                    const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                    return <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between">
                                <span style={{
                        paddingLeft: 6
                      }}>+ {toppingObj}</span>
                                <span>{price > 0 ? price.toFixed(2) + " " + currencySymbol : ""}</span>
                              </div>;
                  })}
                        </div>)}
                    </div>}
                </div>)}
            </div>
          </div>
        </ScrollArea>
        
        {/* Fixed Footer - shrink-0 ensures it doesn't shrink */}
        <div className="p-6 border-t shrink-0 bg-white">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>{t("order.subtotal")}:</span>
              <span>{subtotal.toFixed(2)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t("order.vatWithRate")}:</span>
              <span>{tax.toFixed(2)} {currencySymbol}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>{t("order.totalTTC")}:</span>
              <span>{total.toFixed(2)} {currencySymbol}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 shrink-0">
          <Button onClick={handleConfirmOrder} disabled={placingOrder} className="w-full bg-green-800 hover:bg-green-900 text-white text-4xl py-[30px]">
            <Check className="mr-2 h-5 w-5" />
            {t("order.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};

export default OrderSummary;

