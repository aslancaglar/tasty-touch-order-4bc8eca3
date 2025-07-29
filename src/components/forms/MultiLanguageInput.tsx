import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportedLanguage, LANGUAGE_NAMES } from "@/utils/language-utils";

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
}

export const MultiLanguageInput: React.FC<MultiLanguageInputProps> = ({
  label,
  placeholder,
  type = "text",
  values,
  onChange,
  error,
  required = false
}) => {
  const languages: SupportedLanguage[] = ['fr', 'en', 'tr'];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      
      <Tabs defaultValue="fr" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {languages.map((lang) => (
            <TabsTrigger key={lang} value={lang} className="text-xs">
              {LANGUAGE_NAMES[lang]}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {languages.map((lang) => (
          <TabsContent key={lang} value={lang} className="mt-2">
            {type === "textarea" ? (
              <Textarea
                placeholder={`${placeholder || label} (${LANGUAGE_NAMES[lang]})`}
                value={values[lang] || ""}
                onChange={(e) => onChange(lang, e.target.value)}
                className="min-h-[80px]"
              />
            ) : (
              <Input
                placeholder={`${placeholder || label} (${LANGUAGE_NAMES[lang]})`}
                value={values[lang] || ""}
                onChange={(e) => onChange(lang, e.target.value)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};