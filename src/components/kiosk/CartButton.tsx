
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
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
  total: number;
  onClick: () => void;
  uiLanguage?: "fr" | "en" | "tr";
  currency?: string;
  cart?: CartItem[]; // Added to match usage in KioskView
  toggleCart?: () => void; // Added to match usage in KioskView
  currencySymbol?: string; // Added to match usage in KioskView
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
  itemCount,
  total,
  onClick,
  uiLanguage = "fr",
  currency = "EUR",
  cart = [], // Provide default values
  toggleCart,
  currencySymbol: providedCurrencySymbol
}) => {
  // If cart is provided, calculate itemCount and total from it
  const calculatedItemCount = cart.length > 0 
    ? cart.reduce((sum, item) => sum + item.quantity, 0)
    : itemCount;
  
  const calculatedTotal = cart.length > 0
    ? cart.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0)
    : total;
  
  // Use provided currencySymbol or calculate it
  const currencySymbol = providedCurrencySymbol || getCurrencySymbol(currency);
  
  // If count is 0, don't show button
  if (calculatedItemCount === 0) return null;
  
  const t = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];
  
  // Use provided toggleCart or fall back to onClick
  const handleClick = toggleCart || onClick;
  
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center">
      <Button 
        onClick={handleClick} 
        className="text-white rounded-full p-4 shadow-lg bg-red-600 hover:bg-red-500 text-justify text-3xl py-[40px] px-[100px] font-bold"
      >
        <ShoppingCart className="h-12 w-12 mr-2" />
        <span className="font-bold">{calculatedItemCount}</span>
        <span className="mx-2">|</span>
        <span className="font-bold">{calculatedTotal.toFixed(2)} {currencySymbol}</span>
        <span className="ml-3 font-semibold">{t("viewCart")}</span>
      </Button>
    </div>
  );
};

export default CartButton;
