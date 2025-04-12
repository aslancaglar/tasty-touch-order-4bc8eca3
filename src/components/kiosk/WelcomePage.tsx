
import { useNavigate } from "react-router-dom";
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";

interface WelcomePageProps {
  restaurant: Restaurant;
  onStart: () => void;
}

const WelcomePage = ({ restaurant, onStart }: WelcomePageProps) => {
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center"
      style={{ 
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80'})` 
      }}
    >
      <div className="mb-8 text-center">
        <h1 className="text-white text-5xl font-bold mb-2">{restaurant.name}</h1>
        <p className="text-white text-xl">Welcome to our self-ordering kiosk</p>
      </div>

      <Button 
        onClick={onStart}
        className="bg-white hover:bg-white/90 text-black hover:text-black/90 w-64 h-24 text-2xl font-bold rounded-full shadow-lg animate-pulse"
      >
        <UtensilsCrossed className="mr-2 h-6 w-6" />
        TOUCH TO ORDER
      </Button>
    </div>
  );
};

export default WelcomePage;
