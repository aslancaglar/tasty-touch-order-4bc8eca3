
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeCacheConfig } from './services/cache-config.ts'

// Initialize cache configuration with default settings
// This must be done before rendering the app to prevent cache-related errors
initializeCacheConfig();

createRoot(document.getElementById("root")!).render(<App />);
