
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

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
  count?: number; // Changed from itemCount to count
  total?: number;
  onClick: () => void;
  uiLanguage?: "fr" | "en" | "tr";
  currency?: string;
}

const translations = {
  fr: {
    viewCart: "Voir le panier"
  },
  en: {
    viewCart: "View Cart"
  },
  tr: {
    viewCart: "Sepeti Görüntüle"
  }
};

const CartButton: React.FC<CartButtonProps> = ({
  count = 0,
  total = 0,
  onClick,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  if (count === 0) return null;
  const t = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];
  const currencySymbol = getCurrencySymbol(currency);
  
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button 
        onClick={onClick} 
        className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl py-[40px] px-[100px] font-bold"
      >
        <ShoppingCart className="h-12 w-12 mr-2" />
        <span className="font-bold">{count}</span>
        <span className="mx-2">|</span>
        <span className="font-bold">{total.toFixed(2)} {currencySymbol}</span>
        <span className="ml-3 font-semibold">{t("viewCart")}</span>
      </Button>
    </div>
  );
};

export default CartButton;
