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
  return <div className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center" style={{
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6)), url(${restaurant.image_url || "https://images.unsplash.com/photo-1571091718767-18b5b1457add?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80"})`
  }}>
      <div className="mb-8 text-center">
        <h1 className="text-white font-bold mb-2 text-7xl">{restaurant.name}</h1>
        <p className="text-white text-3xl">{t("welcome.title")}</p>
      </div>
      <Button onClick={onStart} className="w-100 h-24 font-bold shadow-lg animate-pulse rounded-full mx-0 bg-violet-700 hover:bg-violet-600 text-slate-50 text-8xl px-[60px] py-[90px]">
        {t("welcome.start")}
      </Button>
    </div>;
};
export default WelcomePage;