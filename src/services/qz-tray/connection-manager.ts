
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
      
      // Set up security configuration for development/testing
      window.qz.security.setCertificatePromise(() => {
        console.log('Using empty certificate for development');
        return Promise.resolve('');
      });

      window.qz.security.setSignaturePromise((toSign: string) => {
        console.log('Using empty signature for development, data to sign:', toSign);
        return Promise.resolve('');
      });

      console.log('Attempting to connect to QZ Tray WebSocket...');
      await window.qz.websocket.connect();
      this.isConnected = true;
      console.log('QZ Tray connected successfully');
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error);
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
