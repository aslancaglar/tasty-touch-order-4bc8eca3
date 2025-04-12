
import { KioskOrderType } from "@/types/kiosk-types";
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type KioskOrderConfirmationScreenProps = {
  restaurant: Restaurant;
  orderType: KioskOrderType | null;
  onNewOrder: () => void;
};

export const KioskOrderConfirmationScreen = ({
  restaurant,
  orderType,
  onNewOrder
}: KioskOrderConfirmationScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white p-6">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold">COMMANDE CONFIRMÉE!</h1>
          
          <p className="text-gray-600 mt-4">
            Votre commande a été placée avec succès
            {orderType === 'takeaway' 
              ? ' à emporter.' 
              : orderType === 'dine-in' 
                ? ' sur place.' 
                : '.'}
          </p>
        </div>
        
        <Button 
          onClick={onNewOrder}
          className="bg-red-600 hover:bg-red-700 w-full py-6 text-lg"
          size="lg"
        >
          PASSER UNE NOUVELLE COMMANDE
        </Button>
      </div>
    </div>
  );
};
