import React from 'react';
import { Button } from '@/components/ui/button';
import { SupportedLanguage, LANGUAGE_NAMES } from '@/utils/language-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageSelectorProps {
  availableLanguages?: SupportedLanguage[];
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  availableLanguages = ['fr', 'en', 'tr'],
  className = ''
}) => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Globe className="w-4 h-4" />
          {LANGUAGE_NAMES[language]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={language === lang ? 'bg-accent' : ''}
          >
            {LANGUAGE_NAMES[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};