
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { calculateCartTotals } from "@/utils/price-utils";
import { CartItem } from "@/types/database-types";

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
  const code = currency?.toUpperCase() || "EUR";
  return CURRENCY_SYMBOLS[code] || code;
}

interface CartButtonProps {
  itemCount: number;
  cart: CartItem[];
  onClick: () => void;
  uiLanguage?: SupportedLanguage;
  currency?: string;
  total?: number; // Added the total prop
}

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  cart,
  onClick,
  uiLanguage = "fr",
  currency = "EUR",
  total // Added total parameter
}) => {
  if (itemCount === 0) return null;
  
  const { t } = useTranslation(uiLanguage);
  const currencySymbol = getCurrencySymbol(currency);
  
  // Calculate the total using our utility that properly handles promotions and toppings
  // If total is provided as a prop, use that instead
  const calculatedTotal = total !== undefined ? total : calculateCartTotals(cart).total;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button 
        onClick={onClick} 
        className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl font-bebas tracking-wide py-[50px] px-[102px]"
      >
        <ShoppingBag className="h-12 w-12 mr-2" />
        <span className="font-bebas text-5xl">{itemCount}</span>
        <span className="mx-2">|</span>
        <span className="font-bebas text-5xl">{calculatedTotal.toFixed(2)} {currencySymbol}</span>
        <span className="ml-3 font-bebas text-5xl">{t("cart.viewCart")}</span>
      </Button>
    </div>
  );
};

export default CartButton;
