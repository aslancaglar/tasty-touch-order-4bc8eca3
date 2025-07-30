
import fr from '../translations/fr.json';
import en from '../translations/en.json';
import tr from '../translations/tr.json';
import de from '../translations/de.json';
import es from '../translations/es.json';
import it from '../translations/it.json';
import nl from '../translations/nl.json';
import pt from '../translations/pt.json';
import ru from '../translations/ru.json';
import ar from '../translations/ar.json';
import zh from '../translations/zh.json';

export type SupportedLanguage = 'fr' | 'en' | 'tr' | 'de' | 'es' | 'it' | 'nl' | 'pt' | 'ru' | 'ar' | 'zh';

// Default language is French
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

// Language display names
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pt: 'Português',
  ru: 'Русский',
  ar: 'العربية',
  zh: '中文'
};

// Get translated field from database object
export function getTranslatedField(
  obj: any,
  fieldName: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  fallbackLanguage: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  // Try to get the translated field for the requested language
  const translatedField = obj[`${fieldName}_${language}`];
  if (translatedField && translatedField.trim()) {
    return translatedField;
  }
  
  // If not found, try fallback language
  if (language !== fallbackLanguage) {
    const fallbackField = obj[`${fieldName}_${fallbackLanguage}`];
    if (fallbackField && fallbackField.trim()) {
      return fallbackField;
    }
  }
  
  // Last resort: try the original field without language suffix
  const originalField = obj[fieldName];
  if (originalField && originalField.trim()) {
    return originalField;
  }
  
  return fieldName; // Return field name as last fallback
}

// All available translations
const translations = {
  fr,
  en,
  tr,
  de,
  es,
  it,
  nl,
  pt,
  ru,
  ar,
  zh
};

// Get translation for a specific key
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
