
import { toast } from "@/hooks/use-toast";
import { SupportedLanguage } from "@/utils/language-utils";

export interface RestaurantErrorContext {
  slug?: string;
  restaurantId?: string;
  error?: any;
  timestamp: number;
  userAgent: string;
  url: string;
}

export interface RestaurantErrorHandlerOptions {
  showToast?: boolean;
  redirectToHome?: boolean;
  logError?: boolean;
}

/**
 * Centralized restaurant error handler with detailed logging and user feedback
 */
export const handleRestaurantError = (
  errorType: 'not_found' | 'network_error' | 'cache_error' | 'database_error',
  context: RestaurantErrorContext,
  options: RestaurantErrorHandlerOptions = {},
  uiLanguage: SupportedLanguage = 'fr'
) => {
  const { showToast = true, redirectToHome = false, logError = true } = options;

  // Log detailed error information
  if (logError) {
    console.error(`[RestaurantError] ${errorType}:`, {
      type: errorType,
      context,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
  }

  // Show user-friendly error message
  if (showToast) {
    const errorMessages = {
      fr: {
        not_found: "Restaurant introuvable",
        not_found_desc: "Ce restaurant n'existe pas ou n'est plus disponible.",
        network_error: "Erreur de connexion",
        network_error_desc: "Vérifiez votre connexion internet.",
        cache_error: "Erreur de cache",
        cache_error_desc: "Problème temporaire, veuillez réessayer.",
        database_error: "Erreur de base de données",
        database_error_desc: "Un problème technique est survenu."
      },
      en: {
        not_found: "Restaurant not found",
        not_found_desc: "This restaurant doesn't exist or is no longer available.",
        network_error: "Connection error",
        network_error_desc: "Please check your internet connection.",
        cache_error: "Cache error",
        cache_error_desc: "Temporary issue, please try again.",
        database_error: "Database error",
        database_error_desc: "A technical problem occurred."
      },
      tr: {
        not_found: "Restoran bulunamadı",
        not_found_desc: "Bu restoran mevcut değil veya artık kullanılabilir değil.",
        network_error: "Bağlantı hatası",
        network_error_desc: "İnternet bağlantınızı kontrol edin.",
        cache_error: "Önbellek hatası",
        cache_error_desc: "Geçici sorun, lütfen tekrar deneyin.",
        database_error: "Veritabanı hatası",
        database_error_desc: "Teknik bir sorun oluştu."
      }
    };

    const messages = errorMessages[uiLanguage];
    
    toast({
      title: messages[errorType as keyof typeof messages],
      description: messages[`${errorType}_desc` as keyof typeof messages],
      variant: "destructive",
      duration: 5000,
    });
  }

  // Optional redirect to home
  if (redirectToHome) {
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  }

  // Return error details for further processing
  return {
    errorType,
    context,
    handled: true,
    timestamp: Date.now()
  };
};

/**
 * Validate restaurant slug format
 */
export const validateRestaurantSlug = (slug: string): boolean => {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Check for valid slug format (alphanumeric, hyphens, underscores)
  const slugPattern = /^[a-zA-Z0-9-_]+$/;
  return slugPattern.test(slug) && slug.length >= 2 && slug.length <= 100;
};

/**
 * Get error context from current environment
 */
export const getErrorContext = (slug?: string, restaurantId?: string, error?: any): RestaurantErrorContext => {
  return {
    slug,
    restaurantId,
    error: error ? {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 500) // Limit stack trace length
    } : undefined,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
};
