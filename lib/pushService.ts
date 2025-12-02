import { getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import withRetry, { isNetworkError } from './withRetry';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { logger } from './logger';

type RegisterResult = { success: boolean; token?: string; message?: string };

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// Track service worker readiness state to avoid redundant polling
let swReadyPromise: Promise<ServiceWorkerRegistration | undefined> | null = null;
let swIsReady = false;

/**
 * Ensures the service worker is registered if it hasn't been already.
 * This is called before attempting any push operations to guarantee SW exists.
 */
const ensureServiceWorkerRegistered = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) return;
  
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length > 0) {
    logger.log('[pushService] Service worker already registered');
    return;
  }
  
  // Register the service worker if not already registered
  logger.log('[pushService] No service worker found, registering now...');
  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    logger.log('[pushService] Service worker registered successfully');
  } catch (err) {
    logger.error('[pushService] Failed to register service worker:', err);
    throw new Error('Failed to register service worker for push notifications');
  }
};

/**
 * Wait for service worker to be ready with a timeout.
 * On first page load, SW registration may be in progress; this ensures we don't
 * attempt to subscribe before the SW is active.
 * 
 * This function:
 * 1. Ensures SW is registered if not already
 * 2. Waits for SW to become active with caching for subsequent calls
 * 3. Returns the active registration for use with FCM
 */
const waitForServiceWorkerReady = async (timeoutMs: number = 20000): Promise<ServiceWorkerRegistration | undefined> => {
  if (!('serviceWorker' in navigator)) return undefined;

  // Return cached promise if already waiting or ready
  if (swIsReady && swReadyPromise) {
    logger.log('[pushService] Returning cached SW ready promise');
    return swReadyPromise;
  }

  // If we have an in-flight promise, return it to avoid duplicate work
  if (swReadyPromise) {
    return swReadyPromise;
  }

  swReadyPromise = (async () => {
    try {
      // First, ensure the service worker is registered
      await ensureServiceWorkerRegistered();
      
      // If there's already an active controller, we're good
      if (navigator.serviceWorker.controller) {
        logger.log('[pushService] Service worker controller already active');
        swIsReady = true;
        return await navigator.serviceWorker.ready;
      }

      // Wait for SW to become ready with timeout
      logger.log('[pushService] Waiting for service worker to become ready...');
      
      // Poll for service worker registration with exponential backoff
      const startTime = Date.now();
      let attempt = 0;
      while (Date.now() - startTime < timeoutMs) {
        attempt++;
        
        // Check if a registration exists
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (attempt <= 3 || attempt % 5 === 0) {
          logger.log(`[pushService] Attempt ${attempt}: Found ${registrations.length} registration(s)`);
        }
        
        if (registrations.length > 0) {
          const registration = registrations[0];
          
          // Check if registration has an active worker
          if (registration.active) {
            logger.log('[pushService] Service worker is active and ready');
            swIsReady = true;
            return registration;
          }
          
          // Check if there's an installing or waiting worker
          const pendingWorker = registration.installing || registration.waiting;
          if (pendingWorker) {
            logger.log(`[pushService] Service worker is ${pendingWorker.state}, waiting for activation...`);
            
            // Wait for the worker to activate
            await new Promise<void>((resolve) => {
              const onStateChange = () => {
                if (pendingWorker.state === 'activated') {
                  pendingWorker.removeEventListener('statechange', onStateChange);
                  resolve();
                } else if (pendingWorker.state === 'redundant') {
                  pendingWorker.removeEventListener('statechange', onStateChange);
                  resolve(); // Will be caught on next iteration
                }
              };
              
              pendingWorker.addEventListener('statechange', onStateChange);
              
              // Safety timeout to prevent infinite hang
              setTimeout(() => {
                pendingWorker.removeEventListener('statechange', onStateChange);
                resolve();
              }, 5000);
            });
            
            // Re-check if active now
            if (registration.active) {
              logger.log('[pushService] Service worker activated successfully');
              swIsReady = true;
              return registration;
            }
          }
        }
        
        // Wait before next attempt (exponential backoff: 100ms, 200ms, 400ms, 800ms, then 1s max)
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Timeout reached - try one last time with navigator.serviceWorker.ready
      logger.warn('[pushService] Polling timed out, attempting navigator.serviceWorker.ready as fallback...');
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Service worker ready timeout')), 5000)
      );
      
      const registration = await Promise.race([readyPromise, timeoutPromise]);
      swIsReady = true;
      return registration;
    } catch (e) {
      // Reset cached promise on failure so next attempt can retry
      swReadyPromise = null;
      swIsReady = false;
      logger.warn('[pushService] Error waiting for service worker:', e);
      throw new Error('Service worker is still initializing. Please wait a moment and try again.');
    }
  })();

  return swReadyPromise;
};

const requestPermissionAndGetToken = async (): Promise<string> => {
  if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser');
  logger.log('[pushService] Requesting notification permission');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  if (!VAPID_KEY) throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in your environment.');

  if (!isSupported()) {
    logger.warn('[pushService] Firebase messaging not supported in this environment');
    throw new Error('Firebase messaging is not supported in this environment');
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);
  
  // Wait for service worker to be ready before attempting to get token
  // This prevents "no active Service Worker" errors on first page load
  const registration = await waitForServiceWorkerReady();
  
  logger.log('[pushService] Obtaining FCM token with VAPID key and service worker registration:', !!registration);
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration as any });
  if (!token) throw new Error('Failed to obtain messaging token');
  logger.log('[pushService] Obtained FCM token:', token);
  return token;
};

const registerTokenOnServer = async (token: string): Promise<RegisterResult> => {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'registerPushToken');
  try {
    logger.log('[pushService] Calling registerPushToken callable');
    const res = await withRetry(() => fn({ token }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      logger.log('[pushService] registerPushToken succeeded');
      return { success: true, token };
    }
    logger.warn('[pushService] registerPushToken returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    logger.error('[pushService] registerPushToken callable error', err);
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
};

const unregisterTokenOnServer = async (token: string): Promise<RegisterResult> => {
  // Ensure we target the same region the callables are deployed to (us-central1)
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'unregisterPushToken');
  try {
    logger.log('[pushService] Calling unregisterPushToken callable');
    const res = await withRetry(() => fn({ token }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      logger.log('[pushService] unregisterPushToken succeeded');
      return { success: true };
    }
    logger.warn('[pushService] unregisterPushToken returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    logger.error('[pushService] unregisterPushToken callable error', err);
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
};

const setPushEnabledOnServer = async (enabled: boolean): Promise<{ success: boolean; enabled?: boolean; message?: string }> => {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'setPushEnabled');
  try {
    logger.log('[pushService] Calling setPushEnabled callable with', enabled);
    const res = await withRetry(() => fn({ enabled }), { attempts: 3, shouldRetry: isNetworkError });
    const anyRes: any = res;
    if (anyRes?.data?.success) {
      logger.log('[pushService] setPushEnabled succeeded');
      return { success: true, enabled: anyRes.data.enabled };
    }
    logger.warn('[pushService] setPushEnabled returned failure', anyRes?.data);
    return { success: false, message: anyRes?.data?.message || 'Unknown' };
  } catch (err) {
    logger.error('[pushService] setPushEnabled callable error', err);
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
      logger.log('[pushService] enablePush invoked');
      const token = await requestPermissionAndGetToken();
      logger.log('[pushService] enablePush obtained token, registering on server');
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
      logger.log('[pushService] Calling sendTestPush callable');
      const res = await withRetry(() => fn({ token, title, body }), { attempts: 3, shouldRetry: isNetworkError });
      const anyRes: any = res;
      if (anyRes?.data?.success) {
        logger.log('[pushService] sendTestPush succeeded');
        return { success: true, result: anyRes.data.result };
      }
      logger.warn('[pushService] sendTestPush returned failure', anyRes?.data);
      return { success: false, message: anyRes?.data?.message || 'Unknown' };
    } catch (err) {
      logger.error('[pushService] sendTestPush callable error', err);
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  },

  async getCurrentToken(): Promise<string | null> {
    try {
      if (!isSupported()) return null;
      const app = getFirebaseApp();
      const messaging = getMessaging(app);
      if (!VAPID_KEY) return null;
      
      // Wait for service worker to be ready to ensure background notifications work
      const registration = await waitForServiceWorkerReady();

      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration as any });
      logger.log('[pushService] getCurrentToken returned', token);
      return token ?? null;
    } catch (err) {
      logger.warn('[pushService] getCurrentToken error:', err);
      return null;
    }
  },

  /**
   * Check the actual push subscription status by querying PushManager.
   * This is the source of truth for whether push is actually enabled,
   * independent of Firestore state. Use this on component mount to
   * reconcile UI state with actual subscription status.
   * 
   * @returns Object with:
   *   - hasSubscription: true if there's an active push subscription
   *   - hasPermission: true if notification permission is granted
   *   - token: FCM token if subscription exists, null otherwise
   *   - swReady: true if service worker is active
   */
  async getActualPushStatus(): Promise<{
    hasSubscription: boolean;
    hasPermission: boolean;
    token: string | null;
    swReady: boolean;
  }> {
    const result = {
      hasSubscription: false,
      hasPermission: false,
      token: null as string | null,
      swReady: false,
    };

    try {
      if (!this.isPushSupported()) {
        logger.log('[pushService] getActualPushStatus: Push not supported');
        return result;
      }

      // Check notification permission
      result.hasPermission = Notification.permission === 'granted';

      // Check if service worker is ready (don't wait too long for status check)
      if (!('serviceWorker' in navigator)) {
        return result;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0 && registrations[0].active) {
        result.swReady = true;

        // Check for existing push subscription
        const subscription = await registrations[0].pushManager.getSubscription();
        result.hasSubscription = !!subscription;

        // If we have permission and SW is ready, try to get current token
        if (result.hasPermission && result.hasSubscription) {
          try {
            result.token = await this.getCurrentToken();
          } catch {
            // Token retrieval failed, but subscription exists
            logger.warn('[pushService] getActualPushStatus: Token retrieval failed');
          }
        }
      }

      logger.log('[pushService] getActualPushStatus result:', result);
      return result;
    } catch (err) {
      logger.warn('[pushService] getActualPushStatus error:', err);
      return result;
    }
  },

  /**
   * Check if the service worker is ready without waiting.
   * Useful for UI to show appropriate messaging.
   */
  isServiceWorkerReady(): boolean {
    return swIsReady;
  },

  /**
   * Pre-warm the service worker by initiating registration and activation.
   * Call this early (e.g., after login) to reduce latency when user toggles push.
   */
  async preWarmServiceWorker(): Promise<void> {
    if (!this.isPushSupported()) return;
    
    try {
      logger.log('[pushService] Pre-warming service worker...');
      // This will register and wait for activation, caching the result
      await waitForServiceWorkerReady();
      logger.log('[pushService] Service worker pre-warmed successfully');
    } catch (err) {
      // Non-fatal - user can still enable push later
      logger.warn('[pushService] Pre-warm failed (non-fatal):', err);
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

  /**
   * Listen for push subscription change events from the service worker.
   * This handles cases where the subscription expires or is invalidated.
   * Call this once during app initialization.
   * 
   * @param handler - Callback when subscription changes (e.g., to re-verify push status)
   * @returns Unsubscribe function
   */
  onSubscriptionChange(handler: (event: { reason: string; timestamp: number }) => void): () => void {
    if (!('serviceWorker' in navigator)) {
      return () => {};
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGE') {
        logger.log('[pushService] Received subscription change from SW:', event.data);
        handler({
          reason: event.data.reason || 'unknown',
          timestamp: event.data.timestamp || Date.now(),
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', messageHandler);

    return () => {
      navigator.serviceWorker.removeEventListener('message', messageHandler);
    };
  },
};

export default pushService;
