// Firebase Messaging Service Worker for Push Notifications
// This service worker handles background push notifications for the PLV CEIT Digital Classroom Assignment System

// Import Firebase scripts (must be at the top, before any other code)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase configuration
// Note: These values are replaced at build time by Vite
// In development, they are read from environment variables
// These are CLIENT-SIDE credentials and are safe to expose (they're meant to be public)
// Security is handled server-side via Firebase Security Rules and Authentication
const firebaseConfig = {
  apiKey: "AIzaSyAnNcwD89YL2ZJ8cKvdPm4ZOcSiuTfVkZU",
  authDomain: "plv-classroom-assigment.firebaseapp.com",
  projectId: "plv-classroom-assigment",
  storageBucket: "plv-classroom-assigment.firebasestorage.app",
  messagingSenderId: "438195408476",
  appId: "1:438195408476:web:e5ecce47beea6edb90d6cb",
  measurementId: "G-XPLF74P5HH"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages when the app is not in focus
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || 'PLV CEIT Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.notificationId || 'default',
    data: payload.data,
    requireInteraction: false,
    // Add vibration pattern for mobile devices
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  // This looks to see if the current is already open and focuses if it is
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window exists, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating...');
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});
