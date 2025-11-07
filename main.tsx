import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner'
import './styles/globals.css'
import { logger } from './lib/logger'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    {/* Global Toaster: single top-level instance so toasts render immediately during auth transitions */}
    <Toaster />
  </React.StrictMode>,
)

// Register Firebase Messaging service worker for push notifications
if ('serviceWorker' in navigator) {
  // Register in production, or when served locally (localhost) so devs can test background notifications
  const shouldRegister = import.meta.env.PROD || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (shouldRegister) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          logger.log('Service Worker registered for Firebase Messaging and app caching:', registration.scope);
        })
        .catch((err) => {
          logger.warn('Service Worker registration failed:', err);
        });
    });
  } else {
    logger.log('Skipping service worker registration in non-local dev mode');
  }
}
