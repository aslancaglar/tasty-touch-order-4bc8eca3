
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { Loader2, Database, Image, RefreshCcw } from "lucide-react";
import { PreloadStage, PreloaderState } from '@/utils/data-preloader';
import { Button } from '@/components/ui/button';

interface PreloadingScreenProps {
  state: PreloaderState;
  onRetry?: () => void;
  uiLanguage: "fr" | "en" | "tr";
}

const PreloadingScreen: React.FC<PreloadingScreenProps> = ({ state, onRetry, uiLanguage }) => {
  const { isLoading, progress, stage, error, restaurantData } = state;
  
  // Translations
  const translations = {
    fr: {
      loading: "Chargement en cours...",
      loadingRestaurant: "Chargement du restaurant...",
      loadingMenu: "Chargement du menu...",
      loadingItems: "Chargement des détails des articles...",
      loadingToppings: "Chargement des suppléments...",
      loadingImages: "Chargement des images...",
      complete: "Prêt !",
      error: "Erreur de chargement",
      retry: "Réessayer",
      offline: "Mode hors-ligne",
      cached: "Utilisation des données en cache"
    },
    en: {
      loading: "Loading...",
      loadingRestaurant: "Loading restaurant data...",
      loadingMenu: "Loading menu categories...",
      loadingItems: "Loading menu item details...",
      loadingToppings: "Loading toppings...",
      loadingImages: "Loading images...",
      complete: "Ready!",
      error: "Loading error",
      retry: "Try again",
      offline: "Offline mode",
      cached: "Using cached data"
    },
    tr: {
      loading: "Yükleniyor...",
      loadingRestaurant: "Restoran bilgileri yükleniyor...",
      loadingMenu: "Menü kategorileri yükleniyor...",
      loadingItems: "Menü öğe detayları yükleniyor...",
      loadingToppings: "Ekstralar yükleniyor...",
      loadingImages: "Görüntüler yükleniyor...",
      complete: "Hazır!",
      error: "Yükleme hatası",
      retry: "Tekrar dene",
      offline: "Çevrimdışı mod",
      cached: "Önbellek verileri kullanılıyor"
    }
  };
  
  const t = translations[uiLanguage];
  
  // Get the current stage message
  const getStageMessage = (stage: PreloadStage) => {
    switch (stage) {
      case 'restaurant': return t.loadingRestaurant;
      case 'menu': return t.loadingMenu;
      case 'menuItems': return t.loadingItems;
      case 'toppings': return t.loadingToppings;
      case 'images': return t.loadingImages;
      case 'complete': return t.complete;
      case 'error': return t.error;
      default: return t.loading;
    }
  };
  
  // Get the appropriate icon for the current stage
  const getStageIcon = (stage: PreloadStage) => {
    switch (stage) {
      case 'restaurant': return <Loader2 className="animate-spin h-8 w-8" />;
      case 'menu':
      case 'menuItems':
      case 'toppings': return <Database className="h-8 w-8 animate-pulse" />;
      case 'images': return <Image className="h-8 w-8 animate-pulse" />;
      case 'complete': return <Database className="h-8 w-8 text-green-500" />;
      case 'error': return <RefreshCcw className="h-8 w-8 text-red-500" />;
      default: return <Loader2 className="animate-spin h-8 w-8" />;
    }
  };
  
  // Render background with restaurant image if available
  const bgStyle = restaurantData?.image_url
    ? { backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${restaurantData.image_url})` }
    : { backgroundColor: 'rgba(0, 0, 0, 0.8)' };
  
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-cover bg-center text-white p-6 z-50"
      style={bgStyle}
    >
      <div className="max-w-md w-full flex flex-col items-center text-center">
        {/* Restaurant name if available */}
        {restaurantData && (
          <h1 className="text-4xl font-bold mb-6">
            {restaurantData.name}
          </h1>
        )}
        
        {/* Icon for current stage */}
        <div className="mb-4">
          {getStageIcon(stage)}
        </div>
        
        {/* Progress bar */}
        <Progress 
          value={progress} 
          className="w-full h-2 mb-4" 
          indicatorClassName={error ? "bg-red-500" : "bg-green-500"}
        />
        
        {/* Status message */}
        <p className="text-xl font-medium mb-2">
          {getStageMessage(stage)}
        </p>
        
        {/* Error details and retry button */}
        {error && (
          <div className="mt-4">
            <p className="text-red-300 mb-3">{error.message}</p>
            <Button 
              onClick={onRetry} 
              variant="destructive"
              className="mt-2"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t.retry}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreloadingScreen;
