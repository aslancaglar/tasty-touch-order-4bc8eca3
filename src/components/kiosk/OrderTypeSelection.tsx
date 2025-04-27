
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ShoppingBag } from "lucide-react";
import TableSelection from "./TableSelection";
import { Restaurant } from "@/types/database-types";

export type OrderType = "dine-in" | "takeaway" | null;

interface OrderTypeSelectionProps {
  onSelectType: (type: OrderType, tableNumber: string | null) => void;
  restaurant?: Restaurant | null;
  uiLanguage?: "fr" | "en" | "tr";
}

const translations = {
  fr: {
    chooseOrderType: "Choisissez votre type de commande",
    dineIn: "Sur place",
    takeaway: "À emporter"
  },
  en: {
    chooseOrderType: "Choose your order type",
    dineIn: "Dine in",
    takeaway: "Takeaway"
  },
  tr: {
    chooseOrderType: "Sipariş türünüzü seçin",
    dineIn: "Restoranda",
    takeaway: "Paket servis"
  }
};

const OrderTypeSelection: React.FC<OrderTypeSelectionProps> = ({ onSelectType, restaurant, uiLanguage = "fr" }) => {
  const [selectedType, setSelectedType] = useState<OrderType>(null);
  const [showTableSelection, setShowTableSelection] = useState(false);

  const handleSelectType = (type: OrderType) => {
    if (type === "dine-in") {
      setSelectedType(type);
      setShowTableSelection(true);
    } else {
      onSelectType(type, null);
    }
  };

  const handleTableSelected = (tableNumber: string) => {
    onSelectType(selectedType, tableNumber);
  };

  const t = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];

  if (showTableSelection) {
    return (
      <TableSelection onTableSelected={handleTableSelected} onBack={() => setShowTableSelection(false)} />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8">
        <h1 className="text-3xl font-bold text-center mb-12">
          {t("chooseOrderType")}
        </h1>

        <div className="grid grid-cols-2 gap-8">
          <Button
            onClick={() => handleSelectType("dine-in")}
            className="bg-primary hover:bg-primary/90 h-40 flex flex-col gap-4"
          >
            <UtensilsCrossed size={48} />
            <span className="text-xl">{t("dineIn")}</span>
          </Button>

          <Button
            onClick={() => handleSelectType("takeaway")}
            className="bg-secondary hover:bg-secondary/90 h-40 flex flex-col gap-4"
          >
            <ShoppingBag size={48} />
            <span className="text-xl">{t("takeaway")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderTypeSelection;
