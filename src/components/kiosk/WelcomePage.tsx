import React, { useState } from 'react';
import { Restaurant } from '@/types/database-types';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTranslation } from '@/utils/language-utils';
import { Globe } from 'lucide-react';
import { useRestaurantLanguages } from '@/hooks/useRestaurantLanguages';
interface WelcomePageProps {
  restaurant: Restaurant;
  onStart: () => void;
  isDataLoading?: boolean;
}
const WelcomePage: React.FC<WelcomePageProps> = ({
  restaurant,
  onStart,
  isDataLoading = false
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const {
    language: currentLanguage,
    setLanguage
  } = useLanguage();
  const {
    restaurantLanguages,
    loading
  } = useRestaurantLanguages(restaurant.id);
  const t = (key: string) => getTranslation(key, currentLanguage);

  // Filter only active languages for this restaurant
  const availableLanguages = restaurantLanguages.filter(rl => rl.language);
  const handleStart = () => {
    setIsStarting(true);
    onStart();
  };

  // Don't show language selection if loading or only one language
  const showLanguageSelection = !loading && availableLanguages.length > 1;
  return <div className="fixed inset-0 flex flex-col bg-cover bg-center" style={{
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"})`
  }}>
      {/* Main content centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Restaurant name and welcome text */}
        <div className="text-center mb-16">
          <h1 className="text-white font-bold mb-6 text-6xl md:text-7xl lg:text-9xl font-bebas tracking-wide">
            {restaurant.name}
          </h1>
          <p className="text-white text-xl md:text-2xl font-inter lg:text-5xl mb-8">
            {t("welcome.title")}
          </p>
        </div>
        
        {/* Start button */}
        <div className="mb-8">
          <Button onClick={handleStart} disabled={isStarting || isDataLoading} className={`shadow-lg ${!isStarting ? 'animate-pulse' : ''} bg-violet-700 hover:bg-violet-600 text-slate-50 md:text-6xl lg:text-7xl px-12 md:px-[40px] md:py-[70px] lg:px-[60px] lg:py-[90px] font-bebas tracking-wide py-[91px] rounded-full text-xl text-center`}>
            {isStarting || isDataLoading ? <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t("common.loading")}
              </span> : t("welcome.start")}
          </Button>
        </div>
      </div>

      {/* Language selection at bottom of screen */}
      {showLanguageSelection && <div className="pb-8 px-4">
          <div className="flex justify-center gap-4 my-[30px]">
            {availableLanguages.map(restLang => <Button key={restLang.language_code} variant={currentLanguage === restLang.language_code ? "default" : "outline"} size="lg" onClick={() => setLanguage(restLang.language_code as any)} className={`
                  ${currentLanguage === restLang.language_code ? 'bg-violet-700 text-white hover:bg-violet-600 border-violet-700' : 'bg-white/10 text-white hover:bg-white/20 border-white/30'}
                  px-16 py-8 text-3xl font-medium backdrop-blur-sm
                `}>
                {restLang.language?.flag_url ? <img src={restLang.language.flag_url} alt={`${restLang.language.name} flag`} className="h-5 w-8 mr-2 object-cover rounded-sm" /> : <Globe className="h-5 w-5 mr-2" />}
                {restLang.language?.name}
              </Button>)}
          </div>
        </div>}
    </div>;
};
export default WelcomePage;