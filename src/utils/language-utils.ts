
import enTranslations from '../translations/en.json';
import frTranslations from '../translations/fr.json';
import trTranslations from '../translations/tr.json';

// Type of supported languages in the application
export type SupportedLanguage = 'en' | 'fr' | 'tr';

// Type for translations structure
type TranslationKey = keyof typeof enTranslations;

const translations = {
  en: enTranslations,
  fr: frTranslations,
  tr: trTranslations,
};

export const useTranslation = (language: SupportedLanguage = 'fr') => {
  const t = (key: string): string => {
    const selectedLanguage = translations[language] || translations.fr;
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
