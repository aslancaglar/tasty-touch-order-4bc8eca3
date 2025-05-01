
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    'beforeinstallprompt': BeforeInstallPromptEvent;
  }
}

const InstallPWAPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Check if it's an iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(isIOS);
    
    // Store the install prompt event for later use
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast.success("App installed successfully!");
      setInstallPrompt(null);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;
    
    // Reset the install prompt variable
    setInstallPrompt(null);
    
    if (choiceResult.outcome === 'accepted') {
      toast.success("Installing app...");
    } else {
      toast.info("Installation canceled");
    }
  };
  
  // Don't render anything if already installed or no install prompt is available (and not iOS)
  if (isInstalled || (!installPrompt && !isIOSDevice)) {
    return null;
  }
  
  // Instructions for iOS devices (which don't support beforeinstallprompt)
  if (isIOSDevice) {
    return (
      <div className="fixed bottom-16 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200">
        <h3 className="font-bold mb-2">Install this app on your device</h3>
        <p className="text-sm mb-3">
          Tap the share icon <span className="inline-block">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 8V5.2C16 4.0799 16 3.51984 15.782 3.09202C15.5903 2.71569 15.2843 2.40973 14.908 2.21799C14.4802 2 13.9201 2 12.8 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.71569 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.0799 2 5.2V12.8C2 13.9201 2 14.4802 2.21799 14.908C2.40973 15.2843 2.71569 15.5903 3.09202 15.782C3.51984 16 4.07989 16 5.2 16H8M14 22H16.8C17.9201 22 18.4802 22 18.908 21.782C19.2843 21.5903 19.5903 21.2843 19.782 20.908C20 20.4802 20 19.9201 20 18.8V16M8 14L22 14M22 14L18 10M22 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span> and then <strong>Add to Home Screen</strong>
        </p>
        <Button variant="outline" size="sm" onClick={() => setIsIOSDevice(false)}>
          Dismiss
        </Button>
      </div>
    );
  }
  
  // For other browsers that support the install prompt
  return (
    <div className="fixed bottom-16 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50 border border-gray-200">
      <h3 className="font-bold mb-2">Install this app on your device</h3>
      <p className="text-sm mb-3">
        Install this app for a better experience with offline support.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setInstallPrompt(null)}>
          Later
        </Button>
        <Button onClick={handleInstallClick} className="bg-purple-700">
          Install
        </Button>
      </div>
    </div>
  );
};

export default InstallPWAPrompt;
