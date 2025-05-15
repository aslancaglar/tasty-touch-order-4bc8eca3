
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper function to ensure proper encoding of special characters
 * for thermal printers, especially for French characters
 */
export function encodeSpecialCharacters(text: string): string {
  // Replace common French accented characters with their ESC/POS equivalents
  // This mapping uses Code Page 850 (Latin-1) character set
  const charMap: Record<string, string> = {
    'é': '\x82',
    'è': '\x8A',
    'ê': '\x88',
    'ë': '\x89',
    'à': '\x85',
    'â': '\x83',
    'ù': '\x97',
    'û': '\x96',
    'ç': '\x87',
    'î': '\x8C',
    'ï': '\x8B',
    'ô': '\x93',
    'ö': '\x94',
    'ü': '\x81',
    'É': '\x90',
    'È': '\x8F',
    'Ê': '\x88',
    'À': '\xB7',
    'Ç': '\x80',
    '€': '\xD5'
  };
  
  // Replace each special character with its ESC/POS equivalent
  let result = text;
  for (const [char, replacement] of Object.entries(charMap)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  return result;
}
