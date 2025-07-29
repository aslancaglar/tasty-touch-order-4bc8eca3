
import React from "react";
import { Clock, Database } from "lucide-react";
import { Restaurant, OrderType } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./LanguageSelector";

interface KioskHeaderProps {
  restaurant: Restaurant;
  orderType: OrderType;
  tableNumber: string | null;
  t: (key: string) => string;
  onRefresh?: () => void;
}

const KioskHeader: React.FC<KioskHeaderProps> = ({
  restaurant,
  orderType,
  tableNumber,
  t,
  onRefresh
}) => {
  return (
    <div className="h-full w-full bg-cover bg-center relative" style={{
      backgroundImage: `url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})`
    }}>
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      
      {/* Controls in top right corner */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <LanguageSelector className="bg-white/20 text-white hover:bg-white/30 border-white/30" />
        {onRefresh && (
          <Button 
            size="xs" 
            variant="ghost" 
            className="bg-white/20 text-white hover:bg-white/30" 
            onClick={onRefresh}
            aria-label={t("refreshMenu")}
          >
            <Database className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <div className="absolute inset-0 flex items-center p-6">
        <div className="flex items-center">
          {restaurant.logo_url ? (
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover bg-white p-1" 
            />
          ) : restaurant.image_url ? (
            <img 
              src={restaurant.image_url} 
              alt={restaurant.name} 
              className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover" 
            />
          ) : (
            <img 
              src="https://via.placeholder.com/100" 
              alt={restaurant.name} 
              className="h-20 w-20 rounded-full border-2 border-white mr-4 object-cover" 
            />
          )}
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
