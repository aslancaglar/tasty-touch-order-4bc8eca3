
import { PostgrestSingleResponse, PostgrestError } from "@supabase/supabase-js";

/**
 * A type guard function to determine if the response contains an error
 */
export function hasError<T>(response: PostgrestSingleResponse<T>): response is PostgrestSingleResponse<T> & { error: PostgrestError } {
  return response.error !== null;
}

/**
 * Safely handle data from Supabase responses with proper type checking
 * @param data The data object from a Supabase query
 * @param fallback Optional fallback value to return if data is missing or invalid
 */
export function safelyAccessData<T, F = null>(data: T | null | undefined, fallback: F = null as F): T | F {
  if (data === null || data === undefined) {
    return fallback;
  }
  
  // Check if data has error property indicating a Supabase error
  if (typeof data === 'object' && data !== null && 'error' in data) {
    console.error('Supabase error:', (data as any).error);
    return fallback;
  }
  
  return data;
}

/**
 * Helper for type assertions when working with Supabase data
 * Use this when TypeScript can't automatically determine a property exists
 */
export function isDataWithProperty<T, K extends string>(
  data: any,
  property: K
): data is T & Record<K, unknown> {
  return (
    data !== null &&
    typeof data === 'object' &&
    property in data &&
    !('error' in data)
  );
}

/**
 * Helper function to safely cast UUID strings
 */
export function ensureUUID(id: string | unknown): string {
  if (typeof id !== 'string') {
    console.error('Invalid UUID format:', id);
    throw new Error('Invalid UUID format');
  }
  return id;
}

/**
 * Type-safe helper for checking if a property exists and has a specific type
 */
export function getPropertyIfExists<T extends object, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  fallback: T[K]
): T[K] {
  if (!obj) return fallback;
  if (!(key in obj)) return fallback;
  return obj[key] !== null && obj[key] !== undefined ? obj[key] : fallback;
}
