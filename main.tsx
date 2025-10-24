import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register Firebase Messaging service worker for push notifications
if ('serviceWorker' in navigator) {
  // Register in production, when served locally (localhost) or when served over HTTPS.
  // This lets developers test background notifications on secure dev hosts (ngrok / tunneling) and
  // enables service worker registration on iOS devices when the page is served over HTTPS.
  const shouldRegister = import.meta.env.PROD || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'https:';
  if (shouldRegister) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registered for Firebase Messaging:', registration.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  } else {
    console.log('Skipping service worker registration in non-local dev mode');
  }
}
