
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { Restaurant } from "@/types/database-types";

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
  itemCount?: number;
  count?: number; // Added to match KioskView usage
  total: number;
  onClick: () => void;
  restaurant?: Restaurant; // Added to match KioskView usage
  uiLanguage?: SupportedLanguage;
  currency?: string;
}

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  count,
  total,
  onClick,
  restaurant,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  // Use either itemCount or count, with itemCount taking precedence
  const displayCount = itemCount !== undefined ? itemCount : (count || 0);
  
  // If a restaurant is provided, use its currency
  const displayCurrency = restaurant?.currency || currency;
  
  if (displayCount === 0) return null;
  
  const { t } = useTranslation(uiLanguage);
  const currencySymbol = getCurrencySymbol(displayCurrency);
  
  return <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button onClick={onClick} className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl font-bebas tracking-wide py-[50px] px-[102px]">
        <ShoppingBag className="h-12 w-12 mr-2" />
        <span className="font-bebas text-5xl">{displayCount}</span>
        <span className="mx-2">|</span>
        <span className="font-bebas text-5xl">{total.toFixed(2)} {currencySymbol}</span>
        <span className="ml-3 font-bebas text-5xl">{t("cart.viewCart")}</span>
      </Button>
    </div>;
};

export default CartButton;
