import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, DEFAULT_LANGUAGE } from '@/utils/language-utils';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
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
  const [language, setLanguageState] = useState<SupportedLanguage>(
    initialLanguage || DEFAULT_LANGUAGE
  );

  // Load saved language preference from localStorage
  useEffect(() => {
    if (!initialLanguage) {
      const savedLanguage = localStorage.getItem('kiosk-language') as SupportedLanguage;
      if (savedLanguage && ['fr', 'en', 'tr'].includes(savedLanguage)) {
        setLanguageState(savedLanguage);
      }
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