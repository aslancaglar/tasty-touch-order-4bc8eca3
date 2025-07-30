import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRestaurantLanguages } from '@/hooks/useRestaurantLanguages';

interface LanguageSelectorProps {
  restaurantId?: string;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  restaurantId,
  className = ''
}) => {
  const { language, setLanguage } = useLanguage();
  const { restaurantLanguages, loading } = useRestaurantLanguages(restaurantId);

  // Filter only active languages for this restaurant
  const availableLanguages = restaurantLanguages.filter(rl => rl.language);

  // If no restaurant languages configured, don't show selector
  if (loading || availableLanguages.length <= 1) {
    return null;
  }

  const currentLanguage = availableLanguages.find(rl => rl.language_code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Globe className="w-4 h-4" />
          {currentLanguage?.language?.name || language}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((restLang) => (
          <DropdownMenuItem
            key={restLang.language_code}
            onClick={() => setLanguage(restLang.language_code as any)}
            className={language === restLang.language_code ? 'bg-accent' : ''}
          >
            <div className="flex items-center space-x-2">
              {restLang.language?.flag_url && (
                <img
                  src={restLang.language.flag_url}
                  alt={`${restLang.language.name} flag`}
                  className="w-4 h-3 object-cover rounded"
                />
              )}
              <span>{restLang.language?.name}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};