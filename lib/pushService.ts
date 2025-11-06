import { getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import withRetry, { isNetworkError } from './withRetry';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

type RegisterResult = { success: boolean; token?: string; message?: string };

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const requestPermissionAndGetToken = async (): Promise<string> => {
  if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser');
  console.log('[pushService] Requesting notification permission');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  if (!VAPID_KEY) throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in your environment.');

  if (!isSupported()) {
    console.warn('[pushService] Firebase messaging not supported in this environment');
    throw new Error('Firebase messaging is not supported in this environment');
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);
  // If a service worker is registered, associate the token with that registration so
  // background messages are delivered to the service worker (when the page is closed).
  let registration = undefined;
  try {
    if ('serviceWorker' in navigator) {
      // navigator.serviceWorker.ready resolves when a service worker controlling the page is active
      registration = await navigator.serviceWorker.ready;
    }
  } catch (e) {
    // ignore - proceed without explicit registration
    registration = undefined;
  }
  console.log('[pushService] Obtaining FCM token with VAPID key and service worker registration:', !!registration);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration as any });
  if (!token) throw new Error('Failed to obtain messaging token');
  console.log('[pushService] Obtained FCM token:', token);
  return token;
};

const registerTokenOnServer = async (token: string): Promise<RegisterResult> => {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'registerPushToken');
  try {
    console.log('[pushService] Calling registerPushToken callable');
    const res = await withRetry(() => fn({ token }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      console.log('[pushService] registerPushToken succeeded');
      return { success: true, token };
    }
    console.warn('[pushService] registerPushToken returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    console.error('[pushService] registerPushToken callable error', err);
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
};

const unregisterTokenOnServer = async (token: string): Promise<RegisterResult> => {
  // Ensure we target the same region the callables are deployed to (us-central1)
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'unregisterPushToken');
  try {
    console.log('[pushService] Calling unregisterPushToken callable');
    const res = await withRetry(() => fn({ token }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      console.log('[pushService] unregisterPushToken succeeded');
      return { success: true };
    }
    console.warn('[pushService] unregisterPushToken returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    console.error('[pushService] unregisterPushToken callable error', err);
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
};

const setPushEnabledOnServer = async (enabled: boolean): Promise<{ success: boolean; enabled?: boolean; message?: string }> => {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'setPushEnabled');
  try {
    console.log('[pushService] Calling setPushEnabled callable with', enabled);
    const res = await withRetry(() => fn({ enabled }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      console.log('[pushService] setPushEnabled succeeded');
      return { success: true, enabled: anyRes.data.enabled };
    }
    console.warn('[pushService] setPushEnabled returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    console.error('[pushService] setPushEnabled callable error', err);
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
};

export const pushService = {
  // Return whether this runtime environment supports Firebase web messaging and the
  // Notifications API. Useful for UI to hide/disable controls on unsupported browsers
  // (for example older Safari or iOS versions that don't support web push).
  isPushSupported(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      if (!('Notification' in window)) return false;
      return !!isSupported();
    } catch (e) {
      return false;
    }
  },
  async enablePush(): Promise<RegisterResult> {
    try {
      console.log('[pushService] enablePush invoked');
      const token = await requestPermissionAndGetToken();
      console.log('[pushService] enablePush obtained token, registering on server');
      const server = await registerTokenOnServer(token);
      return server;
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  async disablePush(token?: string): Promise<RegisterResult> {
    try {
      if (!token) return { success: false, message: 'No token provided' };
      return await unregisterTokenOnServer(token);
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  async setPushEnabledOnServer(enabled: boolean) {
    return setPushEnabledOnServer(enabled);
  },

  async sendTestNotification(token: string, title?: string, body?: string) {
    const functions = getFunctions(getFirebaseApp(), 'us-central1');
    const fn = httpsCallable(functions, 'sendTestPush');
    try {
      console.log('[pushService] Calling sendTestPush callable');
      const res = await withRetry(() => fn({ token, title, body }), { attempts: 3, shouldRetry: isNetworkError });
      const anyRes: any = res;
      if (anyRes?.data?.success) {
        console.log('[pushService] sendTestPush succeeded');
        return { success: true, result: anyRes.data.result };
      }
      console.warn('[pushService] sendTestPush returned failure', anyRes?.data);
      return { success: false, message: anyRes?.data?.message || 'Unknown' };
    } catch (err) {
      console.error('[pushService] sendTestPush callable error', err);
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  async getCurrentToken(): Promise<string | null> {
    try {
      if (!isSupported()) return null;
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      if (!VAPID_KEY) return null;
      // Try to use an existing service worker registration if available so the returned
      // token is tied to the SW (necessary for background delivery).
      let registration = undefined;
      try {
        if ('serviceWorker' in navigator) {
          registration = await navigator.serviceWorker.ready;
        }
      } catch (_) {
        registration = undefined;
      }

      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration as any });
      console.log('[pushService] getCurrentToken returned', token);
      return token ?? null;
    } catch (err) {
      return null;
    }
  },

  onMessage(handler: (payload: any) => void) {
    try {
      const messaging = getMessaging(getFirebaseApp());
      return onMessage(messaging, (payload_) => handler(payload_));
    } catch (err) {
      // not supported or not initialized
      return () => {};
    }
  },
};

export default pushService;
