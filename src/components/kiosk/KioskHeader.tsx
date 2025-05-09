
import React from "react";
import { Clock, RefreshCw, ArrowLeft } from "lucide-react";
import { Restaurant, OrderType } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { SupportedLanguage, useTranslation } from "@/utils/language-utils";

interface KioskHeaderProps {
  restaurant: Restaurant;
  orderType?: OrderType;
  tableNumber?: string | null;
  t?: (key: string) => string;
  onRefresh?: () => void;
  onBack?: () => void;
  uiLanguage?: SupportedLanguage;
  setUiLanguage?: React.Dispatch<React.SetStateAction<SupportedLanguage>>;
}

const KioskHeader: React.FC<KioskHeaderProps> = ({
  restaurant,
  orderType,
  tableNumber,
  onRefresh,
  onBack,
  uiLanguage = "fr",
  setUiLanguage
}) => {
  // Use the provided t function or get one from useTranslation
  const { t: translationFn } = useTranslation(uiLanguage);
  const t = (key: string) => translationFn(key);
  
  return (
    <div className="h-full w-full bg-cover bg-center relative" style={{
      backgroundImage: `url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
    }}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      
      {/* Back button if onBack is provided */}
      {onBack && (
        <div className="absolute top-4 left-4 z-10">
          <Button 
            size="icon" 
            variant="ghost" 
            className="bg-white/20 text-white hover:bg-white/30" 
            onClick={onBack}
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      )}
      
      {/* Refresh button in top right corner */}
      {onRefresh && (
        <div className="absolute top-4 right-4 z-10">
          <Button 
            size="icon" 
            variant="ghost" 
            className="bg-white/20 text-white hover:bg-white/30" 
            onClick={onRefresh}
            aria-label={t("refreshMenu")}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      )}
      
      <div className="absolute inset-0 flex items-center p-6">
        <div className="flex items-center">
          <img 
            src={restaurant.image_url || 'https://via.placeholder.com/100'} 
            alt={restaurant.name} 
            className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover" 
          />
          <div>
            <h1 className="text-white text-3xl font-bebas tracking-wider">{restaurant.name}</h1>
            <div className="flex items-center text-white text-sm mt-1 font-inter">
              <Clock className="h-4 w-4 mr-1" />
              <span>{restaurant.location || t("open")}</span>
            </div>
            {orderType && 
              <div className="mt-1 px-3 py-1 bg-white/20 rounded-full text-white text-sm inline-flex items-center font-bebas tracking-wide">
                {orderType === 'dine-in' ? 
                  <>
                    <span className="mr-1">{t("dineIn")}</span>
                    {tableNumber && <span>- {t("table")} {tableNumber}</span>}
                  </> : 
                  <span>{t("takeaway")}</span>
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskHeader;
