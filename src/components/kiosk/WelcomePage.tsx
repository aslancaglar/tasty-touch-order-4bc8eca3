
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
import { useState } from "react";

interface WelcomePageProps {
  restaurant: Restaurant;
  onStart: () => void;
  uiLanguage?: SupportedLanguage;
}

const WelcomePage = ({
  restaurant,
  onStart,
  uiLanguage = "fr"
}: WelcomePageProps) => {
  const { t } = useTranslation(uiLanguage);
  const [isStarting, setIsStarting] = useState(false);
  
  const handleStart = () => {
    setIsStarting(true);
    onStart();
  };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center" 
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"})`
      }}
    >
      {/* Logo hidden for now */}
      
      {/* Center content with restaurant name and welcome text */}
      <div className="text-center px-4 mb-20">
        <h1 className="text-white font-bold mb-3 text-6xl md:text-7xl lg:text-9xl font-bebas tracking-wide">
          {restaurant.name}
        </h1>
        <p className="text-white text-xl md:text-2xl font-inter lg:text-5xl">
          {t("welcome.title")}
        </p>
      </div>
      
      {/* Start button - vertically centered */}
      <div>
        <Button 
          onClick={handleStart}
          disabled={isStarting}
          className={`shadow-lg ${!isStarting ? 'animate-pulse' : ''} bg-violet-700 hover:bg-violet-600 text-slate-50 md:text-6xl lg:text-7xl px-12 md:px-[40px] md:py-[70px] lg:px-[60px] lg:py-[90px] font-bebas tracking-wide py-[91px] rounded-full text-xl text-center mt-25`}
        >
          {isStarting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t("loading")}
            </span>
          ) : (
            t("welcome.start")
          )}
        </Button>
      </div>
    </div>
  );
};

export default WelcomePage;
