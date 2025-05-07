
import enTranslations from '../translations/en.json';
import frTranslations from '../translations/fr.json';
import trTranslations from '../translations/tr.json';

// Type of supported languages in the application
export type SupportedLanguage = 'en' | 'fr' | 'tr';

// Define the default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

// Type for translations structure
type TranslationKey = keyof typeof enTranslations;

const translations = {
  en: enTranslations,
  fr: frTranslations,
  tr: trTranslations,
};

export const useTranslation = (language: SupportedLanguage = DEFAULT_LANGUAGE) => {
  const t = (key: string): string => {
    const selectedLanguage = translations[language] || translations[DEFAULT_LANGUAGE];
    // Split the key by dots to access nested objects
    const keys = key.split('.');
    
    // Traverse the object to get the value
    let value: any = selectedLanguage;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return the key if translation not found
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return { t };
};

// Helper function to format currency based on the language
export const formatCurrency = (amount: number, language: SupportedLanguage = DEFAULT_LANGUAGE): string => {
  const currencyMap = {
    en: 'USD',
    fr: 'EUR',
    tr: 'TRY'
  };
  
  const currency = currencyMap[language] || currencyMap[DEFAULT_LANGUAGE];
  
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency
  }).format(amount);
};
