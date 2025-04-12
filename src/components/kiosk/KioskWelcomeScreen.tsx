
import { Check } from "lucide-react";
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";

type KioskWelcomeScreenProps = {
  restaurant: Restaurant;
  onStart: () => void;
};

export const KioskWelcomeScreen = ({ restaurant, onStart }: KioskWelcomeScreenProps) => {
  const defaultImage = "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9";
  const backgroundImage = restaurant.image_url || defaultImage;

  return (
    <div 
      className="h-screen w-full bg-cover bg-center flex flex-col justify-between relative overflow-hidden"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>
      
      <div className="relative z-20 p-6 flex justify-between items-start">
        <div className="flex items-center">
          <img 
            src={restaurant.image_url || defaultImage} 
            alt={restaurant.name} 
            className="h-20 w-20 rounded-full border-2 border-white"
          />
          <div className="ml-4">
            <h1 className="text-white text-3xl font-bold">{restaurant.name}</h1>
            {restaurant.location && (
              <p className="text-white opacity-80">{restaurant.location}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="relative z-20 p-6 w-full max-w-md mx-auto mb-20">
        <Button 
          onClick={onStart}
          className="w-full py-8 text-xl bg-white text-black hover:bg-gray-100"
          size="lg"
        >
          <Check className="mr-2 h-6 w-6" />
          TOUCHEZ POUR COMMANDER
        </Button>
        
        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="h-2 w-2 bg-white rounded-full opacity-70"
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
