import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportedLanguage, LANGUAGE_NAMES } from "@/utils/language-utils";

interface Language {
  code: SupportedLanguage;
  name: string;
}

interface MultiLanguageInputProps {
  label: string;
  placeholder?: string;
  type?: "text" | "textarea";
  values: {
    fr?: string;
    en?: string;
    tr?: string;
    de?: string;
    es?: string;
    it?: string;
    nl?: string;
    pt?: string;
    ru?: string;
    ar?: string;
    zh?: string;
  };
  onChange: (language: SupportedLanguage, value: string) => void;
  error?: string;
  required?: boolean;
  languages?: Language[];
}

export const MultiLanguageInput: React.FC<MultiLanguageInputProps> = ({
  label,
  placeholder,
  type = "text",
  values,
  onChange,
  error,
  required = false,
  languages: propLanguages
}) => {
  // Default to French, English, Turkish if no languages provided
  const defaultLanguages: Language[] = [
    { code: 'fr', name: LANGUAGE_NAMES.fr },
    { code: 'en', name: LANGUAGE_NAMES.en },
    { code: 'tr', name: LANGUAGE_NAMES.tr }
  ];
  
  const languages = propLanguages || defaultLanguages;
  const defaultLanguage = languages[0]?.code || 'fr';

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Tabs defaultValue={defaultLanguage} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${languages.length}, 1fr)` }}>
          {languages.map((lang) => (
            <TabsTrigger key={lang.code} value={lang.code} className="text-xs">
              {lang.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {languages.map((lang) => {
          // Add transitions for newly added languages (not Turkish, French, English)
          const isNewLanguage = !['fr', 'en', 'tr'].includes(lang.code);
          const transitionClass = isNewLanguage 
            ? "animate-fade-in transition-all duration-300 ease-in-out" 
            : "";
          
          return (
            <TabsContent 
              key={lang.code} 
              value={lang.code} 
              className={`mt-2 ${transitionClass}`}
            >
              {type === "textarea" ? (
                <Textarea
                  placeholder={`${placeholder || label} (${lang.name})`}
                  value={values[lang.code] || ""}
                  onChange={(e) => onChange(lang.code, e.target.value)}
                  className={`min-h-[80px] ${isNewLanguage ? 'transition-all duration-200 hover:scale-[1.01]' : ''}`}
                />
              ) : (
                <Input
                  placeholder={`${placeholder || label} (${lang.name})`}
                  value={values[lang.code] || ""}
                  onChange={(e) => onChange(lang.code, e.target.value)}
                  className={isNewLanguage ? 'transition-all duration-200 hover:scale-[1.01]' : ''}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};