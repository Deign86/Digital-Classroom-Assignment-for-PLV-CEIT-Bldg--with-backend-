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
        data: payload.data || {},
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    } catch (err) {
      console.error('Background message handler error', err);
    }
  });
}
