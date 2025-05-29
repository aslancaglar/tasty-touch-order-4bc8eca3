
export class QZConnectionManager {
  private isConnected = false;

  private async loadQZTray(): Promise<void> {
    if (window.qz) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load QZ Tray'));
      document.head.appendChild(script);
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.loadQZTray();
      
      if (!window.qz) {
        throw new Error('QZ Tray not available');
      }

      console.log('Setting up QZ Tray security configuration...');
      
      // Set up security configuration
      window.qz.security.setCertificatePromise(() => {
        console.log('Requesting certificate from QZ Tray...');
        // Let QZ Tray handle certificate automatically
        return window.qz.security.requestSignature ? 
          window.qz.security.requestSignature() : 
          Promise.resolve();
      });

      window.qz.security.setSignaturePromise((toSign: string) => {
        console.log('Signing request with QZ Tray, data to sign:', toSign);
        // For production with installed certificate, let QZ Tray handle signing
        if (window.qz.security.requestSignature) {
          return window.qz.security.requestSignature(toSign);
        }
        // Fallback for development/testing
        return Promise.resolve('');
      });

      console.log('Attempting to connect to QZ Tray WebSocket...');
      await window.qz.websocket.connect();
      this.isConnected = true;
      console.log('QZ Tray connected successfully');
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
      
      // Try alternative security setup if first attempt fails
      if (error.message && error.message.includes('sign')) {
        console.log('Retrying with alternative security configuration...');
        try {
          // Alternative approach: bypass signing entirely
          window.qz.security.setCertificatePromise(() => Promise.resolve());
          window.qz.security.setSignaturePromise(() => Promise.resolve());
          
          await window.qz.websocket.connect();
          this.isConnected = true;
          console.log('QZ Tray connected with bypass security');
          return;
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
      }
      
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected || !window.qz) {
      return;
    }

    try {
      await window.qz.websocket.disconnect();
      this.isConnected = false;
      console.log('QZ Tray disconnected');
    } catch (error) {
      console.error('Error disconnecting QZ Tray:', error);
    }
  }

  isQZConnected(): boolean {
    return this.isConnected;
  }

  async isQZTrayAvailable(): Promise<boolean> {
    try {
      await this.loadQZTray();
      return !!window.qz;
    } catch {
      return false;
    }
  }
}
