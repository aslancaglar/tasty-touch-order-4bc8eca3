
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { hasPromotionPrice } from "@/utils/price-utils";

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
  originalTotal?: number;
  onClick: () => void;
  uiLanguage?: SupportedLanguage;
  currency?: string;
}

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  total,
  originalTotal,
  onClick,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  if (itemCount === 0) return null;
  const { t } = useTranslation(uiLanguage);
  const currencySymbol = getCurrencySymbol(currency);
  const showOriginalPrice = originalTotal && originalTotal > total;
  
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button 
        onClick={onClick} 
        className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl font-bebas tracking-wide py-[50px] px-[102px]"
      >
        <ShoppingBag className="h-12 w-12 mr-2" />
        <span className="font-bebas text-5xl">{itemCount}</span>
        <span className="mx-2">|</span>
        <div className="flex flex-col items-end">
          {showOriginalPrice && (
            <span className="font-bebas text-3xl line-through text-red-200">
              {originalTotal.toFixed(2)} {currencySymbol}
            </span>
          )}
          <span className="font-bebas text-5xl">
            {total.toFixed(2)} {currencySymbol}
          </span>
        </div>
        <span className="ml-3 font-bebas text-5xl">{t("cart.viewCart")}</span>
      </Button>
    </div>
  );
};

export default CartButton;
