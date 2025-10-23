/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// These values are replaced at build time by Vite environment variables in the index.html meta tags.
// If your hosting requires a different approach, ensure the firebase config is available here.
const firebaseConfig = {
  apiKey: self?.__FIREBASE_CONFIG__?.apiKey || null,
  authDomain: self?.__FIREBASE_CONFIG__?.authDomain || null,
  projectId: self?.__FIREBASE_CONFIG__?.projectId || null,
  storageBucket: self?.__FIREBASE_CONFIG__?.storageBucket || null,
  messagingSenderId: self?.__FIREBASE_CONFIG__?.messagingSenderId || null,
  appId: self?.__FIREBASE_CONFIG__?.appId || null,
};

if (!firebaseConfig.apiKey) {
  // silent fail in environments where config is not injected
  console.warn('Firebase config not injected into service worker');
} else {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    try {
      const notificationTitle = payload.notification?.title || 'PLV CEIT';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.message || '',
        icon: '/favicon.ico',
        // Keep any data passed from server (e.g., notificationId, bookingRequestId, url)
        data: payload.data || {},
        // showNotification accepts a `tag` and `renotify` if needed; keep tag small
        tag: payload.data?.notificationId || undefined,
        renotify: false,
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (err) {
      console.error('Background message handler error', err);
    }
  });
}

// Handle notification click to deep-link into the app and focus or open the client window
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const data = event.notification.data || {};

  // Determine target URL priority: explicit url -> bookingRequestId -> notification center
  let target = '/';
  if (data.url) {
    target = data.url;
  } else if (data.bookingRequestId) {
    target = `/booking/${data.bookingRequestId}`;
  } else if (data.notificationId) {
    target = `/notifications`;
  } else {
    target = '/';
  }

  // Attempt to focus an existing client window with same origin, otherwise open a new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Try to find an open window/tab for this origin
      for (const client of windowClients) {
        // If client is already open, focus and navigate
        if (client.url && 'focus' in client) {
          try {
            // If the client supports `navigate`, use it. Otherwise we postMessage a navigate intent
            if (typeof client.navigate === 'function') {
              client.navigate(target);
            } else if (client.postMessage) {
              client.postMessage({ type: 'navigate', url: target });
            }
            return client.focus();
          } catch (e) {
            // ignore and continue
          }
        }
      }

      // No client to focus, open a new window
      return clients.openWindow(target);
    })
  );
});
