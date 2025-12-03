// Firebase Messaging Service Worker for Push Notifications
// This service worker handles background push notifications for the PLV CEIT Digital Classroom Reservation System

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

/**
 * CRITICAL FIX FOR SAFARI/iOS:
 * 
 * Safari does NOT allow "silent" foreground notifications. If a push message is received
 * and handled in the foreground without being pushed to the OS notification center,
 * Safari will INVALIDATE the FCM token after approximately 3 such messages.
 * 
 * See: https://github.com/firebase/firebase-js-sdk/issues/6620#issuecomment-1525230346
 * See: https://stackoverflow.com/questions/77912561/web-push-notifications-stop-working-on-safari
 * 
 * Solution: We handle ALL push events via the 'push' event listener and ALWAYS show
 * a native OS notification. This prevents Safari from thinking the subscription is unused.
 */

// Handle ALL push messages - this is the Safari-compatible approach
// We intercept the push event BEFORE Firebase's default handler
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  // Stop the event from propagating to Firebase's default handler
  // This ensures WE control whether a notification is shown
  event.stopImmediatePropagation();
  
  let payload;
  try {
    payload = event.data ? event.data.json() : {};
    console.log('[firebase-messaging-sw.js] Push payload:', payload);
  } catch (e) {
    console.warn('[firebase-messaging-sw.js] Failed to parse push data:', e);
    payload = {};
  }
  
  // Extract notification data from various possible locations
  const notificationTitle = 
    payload.data?.title || 
    payload.notification?.title || 
    'PLV CEIT Notification';
  
  const notificationBody = 
    payload.data?.body || 
    payload.data?.message || 
    payload.notification?.body || 
    'You have a new notification';
  
  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    // Use a unique tag to allow multiple notifications, or a consistent tag to replace
    tag: payload.data?.notificationId || payload.collapseKey || 'plv-notification-' + Date.now(),
    data: {
      ...payload.data,
      // Include FCM message ID for tracking
      FCM_MSG_ID: payload.fcmMessageId || payload.from
    },
    requireInteraction: false,
    // Renotify ensures user is alerted even if replacing an existing notification
    renotify: true,
    // Add vibration pattern for mobile devices
    vibrate: [200, 100, 200]
  };

  // ALWAYS show a notification on Safari/iOS to prevent token invalidation
  // This is the critical fix - Safari requires actual OS notifications
  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
      .then(() => {
        console.log('[firebase-messaging-sw.js] Notification shown successfully');
        // Notify any open clients that a notification was received
        return clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clientList) => {
        // Post message to open clients so they can update UI if needed
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: payload,
            timestamp: Date.now()
          });
        });
      })
      .catch((err) => {
        console.error('[firebase-messaging-sw.js] Error showing notification:', err);
      })
  );
});

// Note: We no longer use onBackgroundMessage because we handle all push events
// via the 'push' event listener above. This is required for Safari compatibility.
// The Firebase SDK's onBackgroundMessage only handles background messages and
// doesn't guarantee OS notification display, which Safari requires.

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

// Handle push subscription changes (expiration, browser updates, etc.)
// This ensures the app can detect when a subscription becomes invalid
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[firebase-messaging-sw.js] Push subscription changed:', event);
  
  // Notify any open clients that the subscription changed
  // They should re-verify their push status
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGE',
          reason: event.oldSubscription ? 'renewed' : 'expired',
          timestamp: Date.now()
        });
      });
    })
  );
});

// Cache configuration
const CACHE_VERSION = 'v1.3';
const CACHE_NAME = `plv-ceit-classroom-${CACHE_VERSION}`;

// Firebase Storage logo URLs - cached opportunistically via fetch handler
// (not in initial cache because Firebase Storage has CORS restrictions for SW fetch)
const FIREBASE_STORAGE_LOGO_PATTERN = /firebasestorage\.googleapis\.com.*logos.*\.(webp|png|jpg|jpeg)/i;

// Assets to cache on install (only same-origin or CORS-enabled resources)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.ico',
  // Local public copies of logos (same-origin, no CORS issues)
  '/plv-logo.webp',
  '/ceit-logo.webp',
  '/system-logo.webp',
];

// Firebase SDK URLs to cache (these are large and don't change often)
const FIREBASE_CACHE_URLS = [
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js',
];

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installing...');
  
  // Pre-cache static assets and Firebase SDK
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[firebase-messaging-sw.js] Caching static assets and Firebase SDK');
      return Promise.all([
        cache.addAll(STATIC_CACHE_URLS).catch((err) => {
          console.warn('[firebase-messaging-sw.js] Failed to cache some static assets:', err);
        }),
        cache.addAll(FIREBASE_CACHE_URLS).catch((err) => {
          console.warn('[firebase-messaging-sw.js] Failed to cache Firebase SDK:', err);
        })
      ]);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activating...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('plv-ceit-classroom-') && cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[firebase-messaging-sw.js] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // Claim all clients immediately
      return clients.claim();
    })
  );
});

// Fetch event handler - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Check if this is a Firebase Storage logo request (we want to cache these)
  const isFirebaseStorageLogo = FIREBASE_STORAGE_LOGO_PATTERN.test(request.url);

  // Skip Firebase Auth/Firestore/Functions requests (must always be fresh)
  // But allow Firebase Storage logo requests through for caching
  if (
    !isFirebaseStorageLogo && (
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('cloudfunctions.net') ||
      url.pathname.includes('/__/auth/') ||
      url.pathname.includes('/__/firebase/')
    )
  ) {
    return;
  }

  // Strategy: Cache First for static assets, Network First for everything else
  if (
    url.hostname === 'www.gstatic.com' || // Firebase SDK
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    // Cache First strategy for static assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[firebase-messaging-sw.js] Serving from cache:', request.url);
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch((error) => {
          console.error('[firebase-messaging-sw.js] Fetch failed:', error);
          throw error;
        });
      })
    );
  } else {
    // Network First strategy for HTML and dynamic content
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch((error) => {
          console.log('[firebase-messaging-sw.js] Network failed, trying cache:', request.url);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          });
        })
    );
  }
});
