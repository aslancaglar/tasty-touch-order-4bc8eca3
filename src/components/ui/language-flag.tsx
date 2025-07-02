import { cn } from "@/lib/utils";

interface LanguageFlagProps {
  languageCode: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const flagEmojis = {
  'fr': '🇫🇷',
  'en': '🇺🇸',
  'tr': '🇹🇷',
  'es': '🇪🇸',
  'de': '🇩🇪',
  'it': '🇮🇹',
  'pt': '🇵🇹',
  'nl': '🇳🇱',
  'pl': '🇵🇱',
  'ru': '🇷🇺',
  'zh': '🇨🇳',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'ar': '🇸🇦'
};

const languageNames = {
  'fr': 'Français',
  'en': 'English',
  'tr': 'Türkçe',
  'es': 'Español',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'nl': 'Nederlands',
  'pl': 'Polski',
  'ru': 'Русский',
  'zh': '中文',
  'ja': '日本語',
  'ko': '한국어',
  'ar': 'العربية'
};

export const LanguageFlag = ({ languageCode, className, size = "md" }: LanguageFlagProps) => {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl"
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className={cn(sizeClasses[size])}>
        {flagEmojis[languageCode as keyof typeof flagEmojis] || '🌐'}
      </span>
      <span className="text-sm font-medium text-foreground">
        {languageNames[languageCode as keyof typeof languageNames] || languageCode}
      </span>
    </div>
  );
};

export { flagEmojis, languageNames };