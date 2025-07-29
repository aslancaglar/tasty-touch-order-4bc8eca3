import React from 'react';
import { SupportedLanguage, DEFAULT_LANGUAGE } from '@/utils/language-utils';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

const LanguageContext = React.createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
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
    // On initial mount, prioritize initialLanguage if provided
    if (initialLanguage) {
      return initialLanguage;
    }
    
    // Otherwise try to load from localStorage
    const savedLanguage = localStorage.getItem('kiosk-language') as SupportedLanguage;
    if (savedLanguage && ['fr', 'en', 'tr'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // Fall back to default
    return DEFAULT_LANGUAGE;
  });

  // Only handle initialLanguage changes (not initial mount)
  React.useEffect(() => {
    if (initialLanguage && initialLanguage !== language) {
      setLanguageState(initialLanguage);
      // When restaurant sets the language, remove user preference to avoid conflicts
      localStorage.removeItem('kiosk-language');
    }
  }, [initialLanguage, language]);

  const setLanguage = (newLanguage: SupportedLanguage) => {
    setLanguageState(newLanguage);
    localStorage.setItem('kiosk-language', newLanguage);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};