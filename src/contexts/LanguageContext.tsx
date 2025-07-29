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
  const [language, setLanguageState] = React.useState<SupportedLanguage>(
    initialLanguage || DEFAULT_LANGUAGE
  );

  // Initialize language on mount only
  React.useEffect(() => {
    if (initialLanguage) {
      // If initialLanguage is provided, use it and clear any conflicting localStorage
      setLanguageState(initialLanguage);
      localStorage.removeItem('kiosk-language');
    } else {
      // Only load from localStorage if no initialLanguage is provided
      const savedLanguage = localStorage.getItem('kiosk-language') as SupportedLanguage;
      if (savedLanguage && ['fr', 'en', 'tr'].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
      }
    }
  }, []); // Only run on mount

  // Handle initialLanguage changes separately 
  React.useEffect(() => {
    if (initialLanguage && language !== initialLanguage) {
      setLanguageState(initialLanguage);
      localStorage.removeItem('kiosk-language');
    }
  }, [initialLanguage]);

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