
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

interface PwaInstallPromptProps {
  restaurant: {
    name: string;
    slug: string;
  };
  uiLanguage?: "fr" | "en" | "tr";
}

const translations = {
  fr: {
    installApp: "Installer l'application",
    installPrompt: "Installez cette application sur votre appareil pour un accès plus rapide."
  },
  en: {
    installApp: "Install App",
    installPrompt: "Install this app on your device for faster access."
  },
  tr: {
    installApp: "Uygulamayı Yükle",
    installPrompt: "Daha hızlı erişim için bu uygulamayı cihazınıza yükleyin."
  }
};

const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ restaurant, uiLanguage = "en" }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const t = (key: keyof typeof translations["en"]) => {
    return translations[uiLanguage][key];
  };

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }
    
    const handler = (e: Event) => {
      // Prevent the default behavior
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Reset the deferred prompt variable
    setDeferredPrompt(null);
    
    // Hide our UI regardless of outcome
    setShowPrompt(false);
    
    // Log outcome for analytics
    console.log(`User ${outcome} the PWA installation`);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 px-4 py-2 pointer-events-none">
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-4 flex items-center justify-between w-full max-w-md pointer-events-auto">
        <div className="mr-4">
          <p>{t('installPrompt')}</p>
        </div>
        <Button onClick={handleInstallClick} className="whitespace-nowrap">
          <Download className="h-4 w-4 mr-2" />
          {t('installApp')}
        </Button>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
