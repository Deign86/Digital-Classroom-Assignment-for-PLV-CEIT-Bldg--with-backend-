/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
// IMPORTANT: Do NOT import firebase-messaging-compat until after the service worker's
// top-level event handlers are registered. The compat layer validates that the
// 'push', 'pushsubscriptionchange', and 'notificationclick' handlers were added
// during the initial evaluation of the worker script.

// These values are normally injected at build time. If they're not present (for example when
// deploying to platforms that don't run the same build workflow), attempt to fetch a
// runtime config from `/firebase-config.json` so the service worker can initialize.
// This file is public and contains the standard Firebase web config (it's safe to host).
const buildInjected = self?.__FIREBASE_CONFIG__ || null;
async function resolveFirebaseConfig() {
  if (buildInjected && buildInjected.apiKey) {
    return buildInjected;
  }

  // Fallback: try to fetch a JSON file placed at the site root: /firebase-config.json
  try {
    const resp = await fetch('/firebase-config.json', { cache: 'no-store' });
    if (!resp.ok) {
      console.warn('Service worker: /firebase-config.json not found (status ' + resp.status + ')');
      return null;
    }
    const cfg = await resp.json();
    if (cfg && cfg.apiKey) return cfg;
    console.warn('Service worker: /firebase-config.json missing expected fields');
    return null;
  } catch (e) {
    console.warn('Service worker: error fetching /firebase-config.json', e);
    return null;
  }
}

// --- Early top-level event handlers (must be registered during initial evaluation)
// These delegate to `handlePushEvent` / `handleNotificationClick` which will be
// set when Firebase messaging initializes. If events arrive before init, we
// attempt a conservative default handling so notifications still show.

let handlePushEvent = async (event) => {
  // Default behavior: try to parse payload and show notification
  try {
    let payload = null;
    try {
      if (event.data) payload = event.data.json();
    } catch (e) {
      try { payload = { notification: { body: event.data && event.data.text ? event.data.text() : '' } }; } catch (_) { payload = null; }
    }

    if (payload && (payload.notification || payload.data)) {
      const title = (payload.notification && payload.notification.title) || 'PLV CEIT';
      const options = {
        body: (payload.notification && payload.notification.body) || (payload.data && payload.data.message) || '',
        icon: '/favicon.ico',
        data: (payload.data) || {},
        tag: (payload.data && payload.data.notificationId) || undefined,
        renotify: false,
      };
      await self.registration.showNotification(title, options);
    } else {
      // No payload we can parse; show a generic notification to surface the event
      await self.registration.showNotification('PLV CEIT', { body: 'You have a new notification', icon: '/favicon.ico' });
    }
  } catch (err) {
    console.error('Default push handler failed', err);
  }
};

let handleNotificationClick = async (event) => {
  try {
    event.notification.close();
    const data = event.notification.data || {};
    let target = '/';
    if (data.url) target = data.url;
    else if (data.bookingRequestId) target = `/booking/${data.bookingRequestId}`;
    else if (data.notificationId) target = `/notifications`;

    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url && 'focus' in client) {
        try {
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
    return clients.openWindow(target);
  } catch (e) {
    console.error('Default notificationclick handler error', e);
  }
};

self.addEventListener('push', function(event) {
  event.waitUntil((async () => {
    // If a specialized handler exists, call it; otherwise use default
    try {
      return await handlePushEvent(event);
    } catch (e) {
      console.error('Error in push event handler', e);
    }
  })());
});

self.addEventListener('pushsubscriptionchange', function(event) {
  // Best-effort: log, owner may implement re-subscription logic here if desired
  console.warn('pushsubscriptionchange event fired');
  // No-op fallback to satisfy browser requirement
});

self.addEventListener('notificationclick', function(event) {
  event.waitUntil((async () => {
    try {
      return await handleNotificationClick(event);
    } catch (e) {
      console.error('Error in notificationclick delegate', e);
    }
  })());
});

(async () => {
  const firebaseConfig = await resolveFirebaseConfig();
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.warn('Firebase config not injected into service worker and no /firebase-config.json fallback found');
    return;
  }

  try {
    // Import messaging compat AFTER top-level handlers have been registered
    importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // When Firebase messaging delivers a background message it will call this handler.
    // We still keep the top-level 'push' listener for spec compliance; here we replace
    // the default `handlePushEvent` with a Firebase-aware implementation so messages
    // are handled consistently.
    const firebaseBackgroundHandler = function(payload) {
      try {
        const notificationTitle = payload.notification?.title || 'PLV CEIT';
        const notificationOptions = {
          body: payload.notification?.body || payload.data?.message || '',
          icon: '/favicon.ico',
          data: payload.data || {},
          tag: payload.data?.notificationId || undefined,
          renotify: false,
        };
        return self.registration.showNotification(notificationTitle, notificationOptions);
      } catch (err) {
        console.error('Background message handler error', err);
      }
    };

    // Register a single Firebase background handler once (avoid registering inside each
    // push event which can cause duplicate handling). The top-level push handler will
    // delegate to this handler if the payload looks like a Firebase payload.
    try {
      messaging.onBackgroundMessage((payload) => firebaseBackgroundHandler(payload));
    } catch (e) {
      // Some environments may not need or support this; continue gracefully
      console.warn('Service worker: could not register messaging.onBackgroundMessage', e);
    }

    // Replace the delegate to route through Firebase's payload parsing when available
    handlePushEvent = async (event) => {
      try {
        // Try to parse the raw push event payload. If it looks like a Firebase payload
        // (contains notification or data), use the firebaseBackgroundHandler directly.
        if (event && event.data) {
          try {
            const parsed = event.data.json();
            if (parsed && (parsed.notification || parsed.data)) {
              // Firebase-style payload — show a single notification via our firebase handler
              return firebaseBackgroundHandler(parsed);
            }
          } catch (e) {
            // ignore parse errors and fall back to default behavior
          }
        }

        // If we couldn't parse a firebase-like payload, fall back to the default
        // conservative handler that attempts to present a useful notification.
        return (async () => {
          try {
            let payload = null;
            try {
              if (event.data) payload = event.data.json();
            } catch (e) {
              try { payload = { notification: { body: event.data && event.data.text ? event.data.text() : '' } }; } catch (_) { payload = null; }
            }

            if (payload && (payload.notification || payload.data)) {
              const title = (payload.notification && payload.notification.title) || 'PLV CEIT';
              const options = {
                body: (payload.notification && payload.notification.body) || (payload.data && payload.data.message) || '',
                icon: '/favicon.ico',
                data: (payload.data) || {},
                tag: (payload.data && payload.data.notificationId) || undefined,
                renotify: false,
              };
              await self.registration.showNotification(title, options);
            } else {
              await self.registration.showNotification('PLV CEIT', { body: 'You have a new notification', icon: '/favicon.ico' });
            }
          } catch (err) {
            console.error('Default push handler failed', err);
          }
        })();
      } catch (e) {
        console.error('Error delegating push event to Firebase handler', e);
        return Promise.resolve();
      }
    };

    // Ensure notification click delegate uses same logic (already set above to default)
  } catch (e) {
    console.error('Service worker: failed to initialize Firebase messaging', e);
  }
})();

// (notificationclick handled above by top-level delegate)
