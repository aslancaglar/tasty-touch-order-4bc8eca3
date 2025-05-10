
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

// Get translation for a specific key
export function getTranslation(
  key: string, 
  language: SupportedLanguage | string = DEFAULT_LANGUAGE
): string {
  // Ensure language is a supported language
  const safeLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  
  // Split the key by dots to access nested properties
  const keyPath = key.split('.');
  
  // Access the translation object for the selected language
  let translation: any = translations[safeLanguage];
  
  // Traverse the object using the key path
  for (const k of keyPath) {
    if (!translation || typeof translation !== 'object') {
      console.warn(`Translation missing for key: ${key} in language: ${safeLanguage}`);
      
      // If not found in the selected language, try default language
      if (safeLanguage !== DEFAULT_LANGUAGE) {
        return getTranslation(key, DEFAULT_LANGUAGE);
      }
      
      return key; // Return the key itself as fallback
    }
    translation = translation[k];
  }
  
  if (translation === undefined || translation === null) {
    console.warn(`Translation missing for key: ${key} in language: ${safeLanguage}`);
    
    // If not found in the selected language, try default language
    if (safeLanguage !== DEFAULT_LANGUAGE) {
      return getTranslation(key, DEFAULT_LANGUAGE);
    }
    
    return key; // Return the key itself as fallback
  }
  
  return translation;
}

// Function to check if a language string is a supported language
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return ['fr', 'en', 'tr'].includes(lang);
}

// Hook to use translations
export function useTranslation(language: SupportedLanguage | string = DEFAULT_LANGUAGE) {
  const safeLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  
  return {
    t: (key: string) => getTranslation(key, safeLanguage)
  };
}
