import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './firebaseConfig';
import { callGetVapidPublicKey } from './firebaseService';

type PushSubscriptionJson = Record<string, unknown>;

let VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (error) {
    console.warn('SW registration failed:', error);
    return null;
  }
}

export async function askNotificationPermission(): Promise<NotificationPermission> {
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Notification permission request failed', error);
    return 'denied';
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;

  try {
    // If VAPID public key is not baked into the build, try fetching it from the backend callable
    if (!VAPID_PUBLIC_KEY) {
      try {
        const res: any = await callGetVapidPublicKey();
        if (res && res.ok && typeof res.publicKey === 'string') {
          VAPID_PUBLIC_KEY = res.publicKey;
        }
      } catch (err) {
        console.warn('Failed to retrieve VAPID key from backend', err);
      }
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('Missing VAPID public key (VITE_VAPID_PUBLIC_KEY or getVapidPublicKey callable)');
      throw new Error('Missing VAPID public key for push subscriptions');
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    } as PushSubscriptionOptionsInit);
    return subscription;
  } catch (error) {
    console.warn('Push subscription failed:', error);
    return null;
  }
}

export async function sendSubscriptionToServer(subscription: PushSubscription | null, userId?: string) {
  if (!subscription) return { ok: false, message: 'No subscription' };
  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app);
    // Expect a callable function named 'registerPush' on the backend. If missing, this will fail gracefully.
    const fn = httpsCallable(functions, 'registerPush');
    const payload = { subscription: subscription.toJSON(), userId } as { subscription: PushSubscriptionJson; userId?: string };
    const res = await fn(payload);
    return { ok: true, result: res.data };
  } catch (error) {
    console.warn('Failed to send subscription to server', error);
    return { ok: false, message: String(error) };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  try {
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;
    const ok = await subscription.unsubscribe();
    return ok;
  } catch (error) {
    console.warn('Unsubscribe failed', error);
    return false;
  }
}

export default {
  registerServiceWorker,
  askNotificationPermission,
  subscribeToPush,
  sendSubscriptionToServer,
  unsubscribeFromPush,
};
