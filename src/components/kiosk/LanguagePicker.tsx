import { Button } from "@/components/ui/button";
import { LanguageFlag } from "@/components/ui/language-flag";
import { SupportedLanguage } from "@/utils/language-utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface LanguagePickerProps {
  onLanguageSelect: (language: SupportedLanguage) => void;
  className?: string;
}

export const LanguagePicker = ({ onLanguageSelect, className }: LanguagePickerProps) => {
  const { supportedLanguages, selectedLanguage } = useLanguage();

  // Only show language picker if there are multiple supported languages
  if (supportedLanguages.length <= 1) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-4 justify-center">
        {supportedLanguages.map((language) => (
          <Button
            key={language}
            variant={selectedLanguage === language ? "default" : "outline"}
            onClick={() => onLanguageSelect(language)}
            className="flex flex-col h-auto py-4 px-6 bg-white/10 border-white/20 hover:bg-white/20 backdrop-blur-sm"
          >
            <LanguageFlag languageCode={language} size="md" />
          </Button>
        ))}
      </div>
    </div>
  );
};