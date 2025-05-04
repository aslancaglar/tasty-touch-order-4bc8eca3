import { Restaurant } from "@/types/database-types";
import { Button } from "@/components/ui/button";
import { useTranslation, SupportedLanguage } from "@/utils/language-utils";
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
  const {
    t
  } = useTranslation(uiLanguage);
  return <div className="fixed inset-0 flex flex-col items-center justify-between bg-cover bg-center py-16" style={{
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"})`
  }}>
      {/* Empty top space */}
      <div className="flex-grow"></div>
      
      {/* Center section with restaurant name and welcome text */}
      <div className="text-center px-4">
        <h1 className="text-white font-bold mb-3 text-6xl md:text-7xl lg:text-9xl font-bebas tracking-wide">
          {restaurant.name}
        </h1>
        <p className="text-white text-xl md:text-2xl font-inter lg:text-5xl">
          {t("welcome.title")}
        </p>
      </div>
      
      {/* Empty middle space */}
      <div className="flex-grow"></div>
      
      {/* Bottom section with start button */}
      <div className="mb-50">
        <Button onClick={onStart} className="shadow-lg animate-pulse bg-violet-700 hover:bg-violet-600 text-slate-50 md:text-6xl lg:text-7xl px-12 md:px-[40px] md:py-[70px] lg:px-[60px] lg:py-[90px] font-bebas tracking-wide py-[91px] rounded-full text-xl text-center my-[101px]">
          {t("welcome.start")}
        </Button>
      </div>
    </div>;
};
export default WelcomePage;