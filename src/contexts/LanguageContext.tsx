import { createContext, useContext, useState, ReactNode } from 'react';
import { SupportedLanguage, DEFAULT_LANGUAGE } from '@/utils/language-utils';

interface LanguageContextType {
  selectedLanguage: SupportedLanguage;
  setSelectedLanguage: (language: SupportedLanguage) => void;
  supportedLanguages: SupportedLanguage[];
  setSupportedLanguages: (languages: SupportedLanguage[]) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
  initialSupportedLanguages?: SupportedLanguage[];
}

export const LanguageProvider = ({ 
  children, 
  initialLanguage = DEFAULT_LANGUAGE,
  initialSupportedLanguages = [DEFAULT_LANGUAGE]
}: LanguageProviderProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>(initialSupportedLanguages);

  return (
    <LanguageContext.Provider value={{
      selectedLanguage,
      setSelectedLanguage,
      supportedLanguages,
      setSupportedLanguages
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};