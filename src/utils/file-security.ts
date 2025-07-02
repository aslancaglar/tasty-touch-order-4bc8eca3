import { SECURITY_CONFIG } from '@/config/security';

/**
 * Enhanced file upload security utilities
 */

/**
 * Validate file type and security
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${SECURITY_CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    };
  }

  // Check file type
  if (!SECURITY_CONFIG.UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'File type not allowed. Only images are permitted.'
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !SECURITY_CONFIG.UPLOAD.ALLOWED_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: 'File extension not allowed.'
    };
  }

  // Check filename length
  if (file.name.length > SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: `Filename too long. Maximum ${SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH} characters allowed.`
    };
  }

  // Basic filename sanitization check
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return {
      valid: false,
      error: 'Filename contains invalid characters.'
    };
  }

  return { valid: true };
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace dangerous chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase()
    .substring(0, SECURITY_CONFIG.UPLOAD.MAX_FILENAME_LENGTH);
};

/**
 * Check if file appears to be an actual image (basic magic number check)
 */
export const isValidImageFile = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(buffer.slice(0, 4));
      
      // Check for common image file signatures
      const jpegSignature = [0xFF, 0xD8, 0xFF];
      const pngSignature = [0x89, 0x50, 0x4E, 0x47];
      const webpSignature = [0x52, 0x49, 0x46, 0x46]; // RIFF for WebP
      const gifSignature = [0x47, 0x49, 0x46]; // GIF

      const isJpeg = jpegSignature.every((byte, index) => bytes[index] === byte);
      const isPng = pngSignature.every((byte, index) => bytes[index] === byte);
      const isWebp = webpSignature.every((byte, index) => bytes[index] === byte);
      const isGif = gifSignature.every((byte, index) => bytes[index] === byte);

      resolve(isJpeg || isPng || isWebp || isGif);
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Generate secure filename with timestamp
 */
export const generateSecureFilename = (originalFilename: string): string => {
  const extension = originalFilename.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const sanitizedName = sanitizeFilename(originalFilename.replace(/\.[^/.]+$/, ''));
  
  return `${sanitizedName}-${timestamp}-${randomString}.${extension}`;
};