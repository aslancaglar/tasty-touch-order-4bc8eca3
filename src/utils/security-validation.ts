
import { supabase } from "@/integrations/supabase/client";

export const validateMenuItemData = (data: any): boolean => {
  // Validate price is positive
  if (data.price < 0) return false;
  
  // Validate promotion price if present
  if (data.promotion_price !== null && data.promotion_price < 0) return false;
  
  // Validate tax percentage is between 0 and 100
  if (data.tax_percentage !== null && (data.tax_percentage < 0 || data.tax_percentage > 100)) return false;
  
  return true;
};

export const validateToppingData = (data: any): boolean => {
  // Validate price is positive
  if (data.price < 0) return false;
  
  // Validate tax percentage is between 0 and 100
  if (data.tax_percentage !== null && (data.tax_percentage < 0 || data.tax_percentage > 100)) return false;
  
  return true;
};

export const validateOrderData = (data: any): boolean => {
  // Validate total is positive
  if (data.total < 0) return false;
  
  return true;
};

export const validateOrderItemData = (data: any): boolean => {
  // Validate price is positive
  if (data.price < 0) return false;
  
  // Validate quantity is positive
  if (data.quantity <= 0) return false;
  
  return true;
};

export const validateEmailFormat = (email: string): boolean => {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email);
};

export const sanitizeInput = (input: string): string => {
  // Remove any potentially dangerous characters
  return input.replace(/[<>\"']/g, '');
};

export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Maximum size is 5MB.' };
  }
  
  return { valid: true };
};

// Rate limiting for form submissions
const submissionTimes = new Map<string, number[]>();

export const checkRateLimit = (key: string, maxRequests = 5, windowMs = 60000): boolean => {
  const now = Date.now();
  const requests = submissionTimes.get(key) || [];
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => now - time < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  validRequests.push(now);
  submissionTimes.set(key, validRequests);
  
  return true;
};
