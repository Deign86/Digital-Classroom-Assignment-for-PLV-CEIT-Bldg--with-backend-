import { getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

type RegisterResult = { success: boolean; token?: string; message?: string };

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

const requestPermissionAndGetToken = async (): Promise<string> => {
  if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  if (!VAPID_KEY) throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in your environment.');

  if (!isSupported()) {
    throw new Error('Firebase messaging is not supported in this environment');
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) throw new Error('Failed to obtain messaging token');
  return token;
};

const registerTokenOnServer = async (token: string): Promise<RegisterResult> => {
  const functions = getFunctions(getFirebaseApp());
  const fn = httpsCallable(functions, 'registerPushToken');
  const res = await fn({ token });
  const anyRes: any = res;
  if (anyRes?.data?.success) return { success: true, token };
  return { success: false, message: anyRes?.data?.message || 'Unknown' };
};

const unregisterTokenOnServer = async (token: string): Promise<RegisterResult> => {
  const functions = getFunctions(getFirebaseApp());
  const fn = httpsCallable(functions, 'unregisterPushToken');
  const res = await fn({ token });
  const anyRes: any = res;
  if (anyRes?.data?.success) return { success: true };
  return { success: false, message: anyRes?.data?.message || 'Unknown' };
};

export const pushService = {
  async enablePush(): Promise<RegisterResult> {
    try {
      const token = await requestPermissionAndGetToken();
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

  async getCurrentToken(): Promise<string | null> {
    try {
      if (!isSupported()) return null;
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      if (!VAPID_KEY) return null;
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
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
