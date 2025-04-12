
import { Restaurant } from "@/types/database-types";
import { KioskOrderType } from "@/types/kiosk-types";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Utensils } from "lucide-react";

type KioskOrderTypeScreenProps = {
  restaurant: Restaurant;
  onSelectOrderType: (type: KioskOrderType) => void;
};

export const KioskOrderTypeScreen = ({ restaurant, onSelectOrderType }: KioskOrderTypeScreenProps) => {
  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="mb-12">
            <img 
              src={restaurant.image_url || "https://via.placeholder.com/120"} 
              alt={restaurant.name} 
              className="h-24 w-24 rounded-full mx-auto mb-4 border shadow-sm"
            />
            <h1 className="text-2xl font-bold uppercase">{restaurant.name}</h1>
          </div>
          
          <h2 className="text-xl mb-10 text-gray-700">
            COMMENT SOUHAITEZ-VOUS DÉGUSTER VOTRE REPAS AUJOURD'HUI ?
          </h2>
          
          <div className="space-y-4">
            <Button 
              onClick={() => onSelectOrderType('takeaway')}
              className="w-full py-8 text-lg bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              À EMPORTER
            </Button>
            
            <Button 
              onClick={() => onSelectOrderType('dine-in')}
              className="w-full py-8 text-lg bg-blue-800 hover:bg-blue-900"
              size="lg"
            >
              <Utensils className="mr-3 h-5 w-5" />
              SUR PLACE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
