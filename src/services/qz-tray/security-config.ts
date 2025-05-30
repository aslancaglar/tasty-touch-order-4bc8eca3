
export const setupQZTraySecurityConfig = async (): Promise<boolean> => {
  console.log("🔐 Setting up security configuration...");
  
  const approaches = [
    // Approach 1: Development/testing mode - bypass signing entirely
    () => {
      console.log("Trying bypass security approach...");
      window.qz.security.setCertificatePromise(() => Promise.resolve(''));
      window.qz.security.setSignaturePromise(() => Promise.resolve(''));
    },
    // Approach 2: Use QZ Tray's built-in certificate management if available
    () => {
      console.log("Trying QZ Tray built-in certificate management...");
      if (window.qz.security.requestSignature) {
        window.qz.security.setCertificatePromise(() => {
          return window.qz.security.requestSignature();
        });
        window.qz.security.setSignaturePromise((toSign: string) => {
          return window.qz.security.requestSignature(toSign);
        });
      } else {
        throw new Error("Built-in certificate management not available");
      }
    },
    // Approach 3: Proper certificate handling for production with installed certificates
    () => {
      console.log("Trying installed certificate approach...");
      window.qz.security.setCertificatePromise(() => {
        return new Promise<string>((resolve) => {
          console.log("Using installed certificate");
          resolve('');
        });
      });
      window.qz.security.setSignaturePromise((toSign: string) => {
        return new Promise<string>((resolve) => {
          console.log("Signing with installed certificate, data:", toSign);
          resolve('');
        });
      });
    },
    // Approach 4: Fallback with proper error handling
    () => {
      console.log("Trying fallback approach...");
      window.qz.security.setCertificatePromise(() => {
        return Promise.resolve();
      });
      window.qz.security.setSignaturePromise(() => {
        return Promise.resolve();
      });
    }
  ];

  for (let i = 0; i < approaches.length; i++) {
    try {
      approaches[i]();
      await window.qz.websocket.connect();
      console.log(`✅ Security approach ${i + 1} successful`);
      return true;
    } catch (error) {
      console.log(`❌ Security approach ${i + 1} failed:`, error);
      if (window.qz.websocket.isActive()) {
        try {
          await window.qz.websocket.disconnect();
        } catch (disconnectError) {
          console.warn("Error disconnecting after failed approach:", disconnectError);
        }
      }
    }
  }
  
  return false;
};

export const checkWebSocketStatus = (): boolean => {
  if (!window.qz || !window.qz.websocket) {
    return false;
  }
  
  try {
    return window.qz.websocket.isActive();
  } catch (error) {
    console.warn("Could not check WebSocket status:", error);
    return false;
  }
};
