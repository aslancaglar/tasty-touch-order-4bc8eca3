
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CartItem } from "@/types/database-types";
import { calculateCartTotals } from "@/utils/price-utils";
import { getGroupedToppings } from "@/utils/receipt-templates";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // State for animating items
  const [visibleItems, setVisibleItems] = useState<{ [key: string]: boolean }>({});

  // Reset and animate items when the dialog opens
  useEffect(() => {
    if (isOpen && cart.length) {
      // Reset all items to invisible initially
      const initialVisibility: { [key: string]: boolean } = {};
      cart.forEach(item => {
        initialVisibility[item.id] = false;
      });
      setVisibleItems(initialVisibility);
      
      // Animate items appearing one after another with setTimeout
      // This approach is more compatible with Firefox
      cart.forEach((item, index) => {
        setTimeout(() => {
          setVisibleItems(prev => ({
            ...prev,
            [item.id]: true
          }));
        }, 100 * index); // 100ms delay between items
      });
    } else {
      // Reset visibility when dialog closes
      setVisibleItems({});
    }
  }, [isOpen, cart]);

  const handleConfirmOrder = async () => {
    // Simply call onPlaceOrder and let the parent component handle the rest
    onPlaceOrder();
  };

  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl md:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Fixed Header */}
        <div className="p-4 border-b flex items-center space-x-2 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">{t("order.summary")}</h2>
        </div>
        
        {/* Scrollable Content Area - Now only contains items */}
        <ScrollArea className="flex-grow overflow-auto p-6">
          <h3 className="font-bold text-lg mb-4">{t("order.items")}</h3>
          
          <div className="space-y-6 mb-6">
            {cart.map(item => <div 
                key={item.id} 
                style={{ 
                  opacity: visibleItems[item.id] ? 1 : 0, 
                  transform: visibleItems[item.id] ? 'translateY(0)' : 'translateY(10px)',
                  transition: 'opacity 300ms ease, transform 300ms ease'
                }}
                className="space-y-2"
              >
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
                  const toppingRef = category?.toppings.find(t => t.name === toppingObj.name || t.name === toppingObj);
                  const price = toppingRef ? parseFloat(toppingRef.price?.toString() ?? "0") : 0;
                  
                  // Get quantity from the toppingObj if it's an object with quantity property
                  const quantity = typeof toppingObj === 'object' && toppingObj.quantity ? toppingObj.quantity : 1;
                  const displayName = typeof toppingObj === 'object' ? toppingObj.name : toppingObj;
                  
                  // Calculate total price for this topping (price * quantity)
                  const totalToppingPrice = price * quantity;
                  
                  return <div key={`${item.id}-cat-summary-${groupIdx}-topping-${topIdx}`} className="flex justify-between">
                              <span style={{ paddingLeft: 6 }}>
                                {quantity > 1 ? `+ ${quantity}x ${displayName}` : `+ ${displayName}`}
                              </span>
                              <span>{totalToppingPrice > 0 ? totalToppingPrice.toFixed(2) + " " + currencySymbol : ""}</span>
                            </div>;
                })}
                      </div>)}
                  </div>}
              </div>)}
          </div>
        </ScrollArea>
        
        {/* Fixed Footer - Now includes totals and confirm button */}
        <div className="p-4 bg-gray-50 border-t flex-shrink-0">
          {/* Totals section */}
          <div className="space-y-2 mb-4">
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
          
          {/* Confirm button with inline style animation for Firefox compatibility */}
          <Button 
            onClick={handleConfirmOrder} 
            disabled={placingOrder} 
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 300ms ease, transform 300ms ease'
            }}
            className="w-full bg-green-800 hover:bg-green-900 text-white text-4xl py-[30px]"
          >
            <Check className="mr-2 h-5 w-5" />
            {t("order.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};

export default OrderSummary;
