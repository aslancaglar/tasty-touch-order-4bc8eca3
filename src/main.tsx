
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from '@/utils/service-worker'
import initializeCacheConfig from "@/utils/cache-config"

// Initialize cache configuration immediately
initializeCacheConfig();

// Register service worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
