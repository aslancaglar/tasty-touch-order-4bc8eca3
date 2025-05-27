
import React from "react";
import { Separator } from "@/components/ui/separator";

interface OrderTotalsProps {
  subtotal: number;
  tax: number;
  total: number;
  uiLanguage: "fr" | "en" | "tr";
}

const translations = {
  fr: {
    totalHT: "Total HT:",
    vatWithRate: "TVA (10%):",
    totalTTC: "Total TTC:",
  },
  en: {
    totalHT: "Subtotal:",
    vatWithRate: "Tax (10%):",
    totalTTC: "TOTAL:",
  },
  tr: {
    totalHT: "Ara Toplam:",
    vatWithRate: "KDV (10%):",
    totalTTC: "TOPLAM:",
  }
};

const OrderTotals: React.FC<OrderTotalsProps> = ({ subtotal, tax, total, uiLanguage }) => {
  const t = (key: keyof typeof translations["en"]) =>
    translations[uiLanguage]?.[key] ?? translations.fr[key];

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-gray-600">
        <span>{t("totalHT")}</span>
        <span>{subtotal.toFixed(2)} €</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>{t("vatWithRate")}</span>
        <span>{tax.toFixed(2)} €</span>
      </div>
      <Separator className="my-2" />
      <div className="flex justify-between font-bold text-lg">
        <span>{t("totalTTC")}</span>
        <span>{total.toFixed(2)} €</span>
      </div>
    </div>
  );
};

export default OrderTotals;
