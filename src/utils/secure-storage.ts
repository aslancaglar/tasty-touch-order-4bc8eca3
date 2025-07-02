// Secure storage utility with encryption for sensitive data

import { SECURITY_CONFIG } from '@/config/security';

/**
 * Simple encryption/decryption using Web Crypto API
 * Note: This is for basic obfuscation, not for highly sensitive data
 */
class SecureStorage {
  private storageKey = 'secure_app_data';
  
  // Generate a key for encryption/decryption
  private async generateKey(): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode('qimbo-kiosk-secure-key-v1'), // Static key for simplicity
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('qimbo-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Encrypt data
  private async encrypt(data: string): Promise<string> {
    try {
      const key = await this.generateKey();
      const encoder = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      );
      
      // Combine iv and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Convert to base64
      return btoa(String.fromCharCode.apply(null, Array.from(combined)));
    } catch (error) {
      console.warn('[SecureStorage] Encryption failed, falling back to plain storage');
      return data;
    }
  }
  
  // Decrypt data
  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.generateKey();
      const decoder = new TextDecoder();
      
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract iv and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('[SecureStorage] Decryption failed, assuming plain text');
      return encryptedData;
    }
  }
  
  // Store data securely
  async setItem(key: string, value: any, encrypt: boolean = false): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const dataToStore = encrypt ? await this.encrypt(serialized) : serialized;
      
      const storageData = this.getStorageData();
      storageData[key] = {
        data: dataToStore,
        encrypted: encrypt,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('[SecureStorage] Failed to store data:', error);
    }
  }
  
  // Retrieve data securely
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const storageData = this.getStorageData();
      const item = storageData[key];
      
      if (!item) return null;
      
      // Check if data is expired (24 hours for sensitive data)
      const maxAge = item.encrypted ? SECURITY_CONFIG.SESSION.MAX_DURATION : 7 * 24 * 60 * 60 * 1000; // 7 days for non-sensitive
      if (Date.now() - item.timestamp > maxAge) {
        this.removeItem(key);
        return null;
      }
      
      const rawData = item.encrypted ? await this.decrypt(item.data) : item.data;
      return JSON.parse(rawData);
    } catch (error) {
      console.warn('[SecureStorage] Failed to retrieve data:', error);
      return null;
    }
  }
  
  // Remove item
  removeItem(key: string): void {
    try {
      const storageData = this.getStorageData();
      delete storageData[key];
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
    } catch (error) {
      console.warn('[SecureStorage] Failed to remove data:', error);
    }
  }
  
  // Clear all secure storage
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('[SecureStorage] Failed to clear storage:', error);
    }
  }
  
  // Get the main storage object
  private getStorageData(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('[SecureStorage] Failed to parse storage data, resetting');
      localStorage.removeItem(this.storageKey);
      return {};
    }
  }
  
  // Clean expired entries
  cleanExpired(): void {
    try {
      const storageData = this.getStorageData();
      let hasChanges = false;
      
      for (const [key, item] of Object.entries(storageData)) {
        const maxAge = (item as any).encrypted ? SECURITY_CONFIG.SESSION.MAX_DURATION : 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - (item as any).timestamp > maxAge) {
          delete storageData[key];
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      }
    } catch (error) {
      console.warn('[SecureStorage] Failed to clean expired entries:', error);
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Clean expired entries on load
secureStorage.cleanExpired();