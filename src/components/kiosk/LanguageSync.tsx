import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SupportedLanguage } from '@/utils/language-utils';

interface LanguageSyncProps {
  children: React.ReactNode;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export const LanguageSync: React.FC<LanguageSyncProps> = ({ children, onLanguageChange }) => {
  const { language } = useLanguage();

  useEffect(() => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  }, [language, onLanguageChange]);

  return <>{children}</>;
};