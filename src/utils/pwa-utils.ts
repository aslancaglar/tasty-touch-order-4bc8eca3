
import { Restaurant } from "@/types/database-types";

// Generate a dynamic manifest for a specific restaurant
export const generateManifest = (restaurant: Restaurant): string => {
  // Default values if properties are missing
  const name = restaurant.name || 'Restaurant Kiosk';
  const slug = restaurant.slug || 'restaurant';
  const imageUrl = restaurant.pwa_icon || restaurant.image_url || '/placeholder.svg';

  const manifest = {
    name: name,
    short_name: name,
    description: `Order food from ${name}`,
    start_url: `/r/${slug}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: imageUrl,
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: imageUrl,
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      }
    ]
  };

  return JSON.stringify(manifest);
};

// Register service worker for PWA functionality
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered successfully');
    } catch (error) {
      console.error('Error registering service worker:', error);
    }
  }
};
