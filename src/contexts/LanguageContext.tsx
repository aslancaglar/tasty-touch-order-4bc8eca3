import React from 'react';
import { SupportedLanguage, DEFAULT_LANGUAGE } from '@/utils/language-utils';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  resetToDefault: () => void;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    console.error('useLanguage called before LanguageProvider is ready, falling back to default');
    // Return a fallback object to prevent errors
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => console.warn('setLanguage called before LanguageProvider is ready'),
      resetToDefault: () => console.warn('resetToDefault called before LanguageProvider is ready')
    };
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ 
  children, 
  initialLanguage 
}) => {
  const [language, setLanguageState] = React.useState<SupportedLanguage>(() => {
    // Prioritize user's saved language preference first
    const savedLanguage = localStorage.getItem('kiosk-language') as SupportedLanguage;
    if (savedLanguage && ['fr', 'en', 'tr', 'de', 'es', 'it', 'nl', 'pt', 'ru', 'ar', 'zh'].includes(savedLanguage)) {
      console.log('[LanguageContext] Using saved user language:', savedLanguage);
      return savedLanguage;
    }
    
    // Fall back to restaurant's initial language if provided
    if (initialLanguage) {
      console.log('[LanguageContext] Using restaurant initial language:', initialLanguage);
      return initialLanguage;
    }
    
    // Final fallback to default
    console.log('[LanguageContext] Using default language:', DEFAULT_LANGUAGE);
    return DEFAULT_LANGUAGE;
  });

  // Only handle initialLanguage changes (not initial mount)
  React.useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      console.log('[LanguageContext] Restaurant language override:', initialLanguage);
      setLanguageState(initialLanguage);
      // When restaurant sets the language, remove user preference to avoid conflicts
      localStorage.removeItem('kiosk-language');
    }
  }, [initialLanguage]);

  const setLanguage = (newLanguage: SupportedLanguage) => {
    console.log('[LanguageContext] User selected language:', newLanguage);
    setLanguageState(newLanguage);
    localStorage.setItem('kiosk-language', newLanguage);
  };

  const resetToDefault = () => {
    console.log('[LanguageContext] Resetting to restaurant default language');
    localStorage.removeItem('kiosk-language');
    
    // Reset to initial language or default
    const targetLanguage = initialLanguage || DEFAULT_LANGUAGE;
    console.log('[LanguageContext] Setting language to:', targetLanguage);
    setLanguageState(targetLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, resetToDefault }}>
      {children}
    </LanguageContext.Provider>
  );
};