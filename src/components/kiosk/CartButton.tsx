
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
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
  const code = currency?.toUpperCase() || "EUR";
  return CURRENCY_SYMBOLS[code] || code;
}

interface CartButtonProps {
  itemCount: number;
  total: number;
  onClick: () => void;
  uiLanguage?: SupportedLanguage;
  currency?: string;
  originalTotal?: number;
}

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  total,
  onClick,
  uiLanguage = "fr",
  currency = "EUR",
  originalTotal
}) => {
  if (itemCount === 0) return null;
  
  const { t } = useTranslation(uiLanguage);
  const currencySymbol = getCurrencySymbol(currency);
  
  // Only show discount if originalTotal is provided and greater than the promotional total
  const hasDiscount = originalTotal !== undefined && originalTotal > total;
  
  return <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button onClick={onClick} className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl font-bebas tracking-wide py-[50px] px-[102px]">
        <ShoppingBag className="h-12 w-12 mr-2" />
        <span className="font-bebas text-5xl">{itemCount}</span>
        <span className="mx-2">|</span>
        <div className="flex flex-col items-center">
          <span className="font-bebas text-5xl">{total.toFixed(2)} {currencySymbol}</span>
          {hasDiscount && (
            <span className="line-through text-gray-300 text-2xl">{originalTotal?.toFixed(2)} {currencySymbol}</span>
          )}
        </div>
        <span className="ml-3 font-bebas text-5xl">{t("cart.viewCart")}</span>
      </Button>
    </div>;
};

export default CartButton;
