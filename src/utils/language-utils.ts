
import fr from '../translations/fr.json';
import en from '../translations/en.json';
import tr from '../translations/tr.json';

export type SupportedLanguage = 'fr' | 'en' | 'tr';

// Default language is French
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

// All available translations
const translations = {
  fr,
  en,
  tr
};

/**
 * Get translation for a specific key
 * Supports both flat keys and nested dot notation (e.g., "receipt.printing")
 */
export function getTranslation(
  key: string, 
  language: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  // Split the key by dots to access nested properties
  const keyPath = key.split('.');
  
  // Access the translation object for the selected language
  let translation: any = translations[language];
  
  // Traverse the object using the key path
  for (const k of keyPath) {
    if (!translation || typeof translation !== 'object') {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      
      // If not found in the selected language, try default language
      if (language !== DEFAULT_LANGUAGE) {
        return getTranslation(key, DEFAULT_LANGUAGE);
      }
      
      return key; // Return the key itself as fallback
    }
    translation = translation[k];
  }
  
  if (translation === undefined || translation === null) {
    console.warn(`Translation missing for key: ${key} in language: ${language}`);
    
    // If not found in the selected language, try default language
    if (language !== DEFAULT_LANGUAGE) {
      return getTranslation(key, DEFAULT_LANGUAGE);
    }
    
    return key; // Return the key itself as fallback
  }
  
  return translation;
}

// Hook to use translations
export function useTranslation(language: SupportedLanguage = DEFAULT_LANGUAGE) {
  return {
    t: (key: string) => getTranslation(key, language)
  };
}
