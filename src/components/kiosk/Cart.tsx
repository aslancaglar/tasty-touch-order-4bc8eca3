import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, ArrowRight, Loader2, Plus, Minus, X } from "lucide-react";
import { CartItem } from "@/types/database-types";
import OrderSummary from "./OrderSummary";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { calculateCartTotals } from "@/utils/price-utils";
import { getTranslatedField } from "@/utils/language-utils";
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
  restaurant?: {
    name: string;
    location?: string;
    currency?: string;
  } | null;
  orderType?: "dine-in" | "takeaway" | null;
  tableNumber?: string | null;
  showOrderSummaryOnly?: boolean;
  uiLanguage?: "fr" | "en" | "tr";
  t: (key: string) => string;
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
function getCurrencySymbol(currency: string) {
  return CURRENCY_SYMBOLS[(currency || "EUR").toUpperCase()] || (currency || "EUR").toUpperCase();
}
const cartTranslations = {
  fr: {
    yourOrder: "VOTRE COMMANDE",
    totalHT: "Total HT:",
    vat: "TVA:",
    totalTTC: "TOTAL TTC:",
    cancel: "ANNULER",
    seeOrder: "VOIR MA COMMANDE",
    confirmed: "CONFIRMÉE",
    processing: "EN COURS...",
    empty: "Aucun article"
  },
  en: {
    yourOrder: "YOUR ORDER",
    totalHT: "Subtotal:",
    vat: "Tax:",
    totalTTC: "TOTAL:",
    cancel: "CANCEL",
    seeOrder: "SEE MY ORDER",
    confirmed: "CONFIRMED",
    processing: "PROCESSING...",
    empty: "No items"
  },
  tr: {
    yourOrder: "SİPARİŞİNİZ",
    totalHT: "Ara Toplam:",
    vat: "KDV:",
    totalTTC: "TOPLAM:",
    cancel: "İPTAL",
    seeOrder: "SİPARİŞİMİ GÖR",
    confirmed: "ONAYLANDI",
    processing: "İŞLENİYOR...",
    empty: "Ürün yok"
  }
};
const Cart: React.FC<CartProps> = ({
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
  restaurant = null,
  orderType = null,
  tableNumber = null,
  showOrderSummaryOnly = false,
  uiLanguage = "fr",
  t
}) => {
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartRef = useRef<HTMLDivElement>(null);

  // Helper function to get cart-specific translations
  const tCart = (key: keyof typeof cartTranslations["en"]) => {
    // Use the provided t function if possible, otherwise fallback to our internal translations
    try {
      return cartTranslations[uiLanguage][key];
    } catch (err) {
      // If the key is missing in our translations, try to use the passed t function
      return t(key);
    }
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !showOrderSummary && cartRef.current && !cartRef.current.contains(event.target as Node)) {
        onToggleOpen();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggleOpen, showOrderSummary]);
  const handleShowOrderSummary = () => {
    setShowOrderSummary(true);
  };
  const handleCloseOrderSummary = () => {
    setShowOrderSummary(false);
  };
  const handlePlaceOrder = () => {
    onPlaceOrder();
    setShowOrderSummary(false);
  };
  if (!isOpen || showOrderSummaryOnly) {
    return null;
  }
  const {
    total,
    subtotal,
    tax
  } = calculateCartTotals(cart);
  const reversedCart = [...cart].reverse();
  const currencySymbol = getCurrencySymbol(restaurant?.currency || "EUR");
  return <>
      <div ref={cartRef} style={{
      maxHeight: "60vh"
    }} className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 shadow-lg overflow-hidden bg-[kiosk-base-100] bg-white">
        <div className="w-full overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b rounded-none bg-kiosk-primary">
            <div className="flex items-center">
              <h2 className="text-responsive-subtitle font-bold text-white">{tCart("yourOrder")} ({cartItemCount})</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onToggleOpen} className="rounded-full h-10 w-10 bg-red-100 hover:bg-red-200">
              <X className="h-5 w-5 text-red-600" />
            </Button>
          </div>

          <ScrollArea className="p-4" style={{
          maxHeight: "40vh"
        }}>
            <Carousel opts={{
            align: "start",
            containScroll: "trimSnaps"
          }} className="w-full">
              <CarouselContent className="-ml-2">
                {reversedCart.length === 0 ? <div className="p-4 text-gray-400 text-center text-responsive-body">{tCart("empty")}</div> : reversedCart.map(item => <CarouselItem key={item.id} className="pl-2 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                    <div className="border border-violet-500 rounded-lg p-3 relative bg-[kiosk-base-100] bg-violet-100">
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1 text-red-500 h-7 w-7" onClick={() => onRemoveItem(item.id)}>
                        <X className="h-5 w-5" />
                      </Button>
                      
                      <div className="flex items-start space-x-3">
                        <img src={item.menuItem.image || '/placeholder.svg'} alt={item.menuItem.name} className="w-16 h-16 object-cover rounded" />
                        <div className="flex flex-col">
                          <h3 className="text-responsive-body font-bold font-bebas text-lg">{getTranslatedField(item.menuItem, 'name', uiLanguage)}</h3>
                          <p className="text-responsive-price text-gray-700">
                            {parseFloat(item.itemPrice.toString()).toFixed(2)} {currencySymbol}
                          </p>
                          
                          <div className="flex items-center mt-2">
                            <Button variant="outline" size="icon" onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="h-8 w-8 rounded-full p-0 bg-violet-700 hover:bg-violet-700 text-white font-bold">
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-responsive-body font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="h-8 w-8 rounded-full p-0 bg-violet-800 hover:bg-violet-700 text-white">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>)}
              </CarouselContent>
            </Carousel>
          </ScrollArea>

          <div className="px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-responsive-body text-gray-600">{tCart("totalHT")}</span>
                <span className="text-responsive-body font-medium">{subtotal.toFixed(2)} {currencySymbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-responsive-body text-gray-600">{tCart("vat")}</span>
                <span className="text-responsive-body font-medium">{tax.toFixed(2)} {currencySymbol}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-responsive-subtitle font-bold">
                <span>{tCart("totalTTC")}</span>
                <span>{total.toFixed(2)} {currencySymbol}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <Button variant="destructive" onClick={onClearCart} className="py-[30px] sm:py-[35px] md:py-[40px] text-xl sm:text-2xl md:text-3xl">
                {tCart("cancel")}
              </Button>
              <Button onClick={handleShowOrderSummary} disabled={placingOrder || orderPlaced || cart.length === 0} className="bg-green-800 hover:bg-green-900 text-white py-[30px] sm:py-[35px] md:py-[40px] text-xl sm:text-2xl md:text-3xl">
                {placingOrder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {orderPlaced && <Check className="h-4 w-4 mr-2" />}
                {orderPlaced ? tCart("confirmed") : placingOrder ? tCart("processing") : tCart("seeOrder")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <OrderSummary isOpen={showOrderSummary} onClose={handleCloseOrderSummary} cart={cart} onPlaceOrder={handlePlaceOrder} placingOrder={placingOrder} calculateSubtotal={calculateSubtotal} calculateTax={calculateTax} getFormattedOptions={getFormattedOptions} getFormattedToppings={getFormattedToppings} restaurant={restaurant} orderType={orderType} tableNumber={tableNumber} uiLanguage={uiLanguage} />
    </>;
};
export default Cart;