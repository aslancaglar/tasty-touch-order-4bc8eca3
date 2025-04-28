
import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";

interface WelcomePageProps {
  restaurant: Restaurant | null;
  onStart: () => void;
  uiLanguage?: "fr" | "en" | "tr";
  onStartOrder?: () => void; 
}

const translations = {
  fr: {
    welcome: "Bienvenue sur notre borne de commande",
    start: "TOUCHEZ POUR COMMANDER",
    loading: "Chargement..."
  },
  en: {
    welcome: "Welcome to our ordering kiosk",
    start: "TOUCH TO START ORDERING",
    loading: "Loading..."
  },
  tr: {
    welcome: "Sipariş kioskumuza hoş geldiniz",
    start: "SİPARİŞE BAŞLAMAK İÇİN DOKUNUN",
    loading: "Yükleniyor..."
  }
};

const WelcomePage = ({
  restaurant,
  onStart,
  onStartOrder,
  uiLanguage = "fr"
}: WelcomePageProps) => {
  const t = (key: keyof typeof translations["en"]) => translations[uiLanguage][key];
  
  // Use onStartOrder if provided, otherwise fallback to onStart
  const handleStart = onStartOrder || onStart;
  
  // If restaurant is null, display loading state
  if (!restaurant) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-800">
        <h1 className="text-white text-4xl">{t("loading")}</h1>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center" style={{
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"})`
    }}>
      <div className="mb-8 text-center">
        <h1 className="text-white font-bold mb-2 text-7xl">{restaurant.name}</h1>
        <p className="text-white text-3xl">{t("welcome")}</p>
      </div>
      <Button onClick={handleStart} className="w-100 h-24 font-bold shadow-lg animate-pulse px-[30px] py-[60px] text-4xl rounded-full mx-0 bg-violet-700 hover:bg-violet-600 text-slate-50">
        {t("start")}
      </Button>
    </div>
  );
};

export default WelcomePage;
