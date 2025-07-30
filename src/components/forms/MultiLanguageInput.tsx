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
        
        {languages.map((lang) => (
          <TabsContent key={lang.code} value={lang.code} className="mt-2">
            {type === "textarea" ? (
              <Textarea
                placeholder={`${placeholder || label} (${lang.name})`}
                value={values[lang.code] || ""}
                onChange={(e) => onChange(lang.code, e.target.value)}
                className="min-h-[80px]"
              />
            ) : (
              <Input
                placeholder={`${placeholder || label} (${lang.name})`}
                value={values[lang.code] || ""}
                onChange={(e) => onChange(lang.code, e.target.value)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};