
// Supabase configuration

// These variables are intentionally exposed as they are public API keys
// and required for client-side authentication
export const SUPABASE_URL = "https://yifimiqeybttmbhuplaq.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZmltaXFleWJ0dG1iaHVwbGFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MDYwNjYsImV4cCI6MjA1OTk4MjA2Nn0.LoMhbECAQxEuf3o35XbFmps5v1-iZ4JieXstrsmylYU";

// Session configuration
export const SESSION_EXPIRY_SECONDS = 3600 * 24 * 7; // 1 week
export const AUTH_STORAGE_KEY = "qimbo-auth-storage";

// Password requirements
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REQUIRES_NUMBERS = true;
export const PASSWORD_REQUIRES_SYMBOLS = true;

