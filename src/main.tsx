
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from '@/utils/service-worker'
import initializeCacheConfig from "@/utils/cache-config"
import { enhancedCacheManager } from '@/services/enhanced-cache-manager'

// Initialize cache configuration immediately
initializeCacheConfig();

// Register service worker
registerServiceWorker();

// Initialize enhanced cache manager (will start background optimization)
enhancedCacheManager;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
