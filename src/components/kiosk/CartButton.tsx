
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

// Place this helper at the top after imports
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
  uiLanguage?: "fr" | "en" | "tr";
  currency?: string;
}

const translations = {
  fr: {
    viewCart: "Voir le panier",
  },
  en: {
    viewCart: "View Cart",
  },
  tr: {
    viewCart: "Sepeti Görüntüle",
  }
};

const CartButton: React.FC<CartButtonProps> = ({
  itemCount,
  total,
  onClick,
  uiLanguage = "fr",
  currency = "EUR"
}) => {
  if (itemCount === 0) return null;

  const t = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];
  
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Button 
        onClick={onClick}
        className="bg-green-800 hover:bg-green-900 text-white rounded-full p-4 shadow-lg"
      >
        <ShoppingCart className="h-6 w-6 mr-2" />
        <span className="font-bold">{itemCount}</span>
        <span className="mx-2">|</span>
        <span className="font-bold">{total.toFixed(2)} {currencySymbol}</span>
        <span className="ml-3 font-semibold">{t("viewCart")}</span>
      </Button>
    </div>
  );
};

export default CartButton;
