import { getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import withRetry, { isNetworkError } from './withRetry';
import { getMessaging, getToken, deleteToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { logger } from './logger';
import { getIOSWebPushStatus, isIOSDevice, isStandaloneMode, type IOSWebPushStatus } from './iosDetection';

type RegisterResult = { success: boolean; token?: string; message?: string };

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

// Track if we've initialized the messaging instance with VAPID key
let messagingInitialized = false;
let cachedMessaging: Messaging | null = null;

/**
 * Initialize Firebase Messaging with VAPID key set early.
 * 
 * CRITICAL FOR SAFARI/iOS: Firebase Functions internally calls getToken() without
 * the VAPID key when initializing context. On Safari, this causes token mismatch
 * and triggers DELETE to FCM registration, invalidating the token.
 * 
 * By setting messaging.vapidKey early (before any Functions call), we prevent this.
 * See: https://github.com/firebase/firebase-js-sdk/issues/6620#issuecomment-2241080938
 */
const getInitializedMessaging = async (): Promise<Messaging> => {
  if (cachedMessaging && messagingInitialized) {
    return cachedMessaging;
  }

  if (!isSupported()) {
    throw new Error('Firebase messaging is not supported in this environment');
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);

  // CRITICAL: Set VAPID key on messaging instance IMMEDIATELY
  // This prevents Firebase Functions from calling getToken without VAPID key
  if (VAPID_KEY) {
    // @ts-ignore - vapidKey is not in the public API but exists on the internal object
    messaging.vapidKey = VAPID_KEY;
    logger.log('[pushService] VAPID key set on messaging instance (Safari fix)');
  }

  cachedMessaging = messaging;
  messagingInitialized = true;

  return messaging;
};

// Track service worker readiness state to avoid redundant polling
let swReadyPromise: Promise<ServiceWorkerRegistration | undefined> | null = null;
let swIsReady = false;

/**
 * Ensures the service worker is registered if it hasn't been already.
 * This is called before attempting any push operations to guarantee SW exists.
 * 
 * IMPORTANT FOR SAFARI/iOS: The service worker scope MUST be set correctly.
 * If you register your own service-worker, you must set the scope to be 
 * "/firebase-messaging-sw.js". Otherwise on the next reload, Firebase sees 
 * mismatch scopes and recreates the token.
 * See: https://github.com/firebase/firebase-js-sdk/issues/6620#issuecomment-2241080938
 */
const ensureServiceWorkerRegistered = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  
  const registrations = await navigator.serviceWorker.getRegistrations();
  
  // Check if we already have the Firebase messaging SW registered with correct scope
  const existingFCMReg = registrations.find(reg => 
    reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
  );
  
  if (existingFCMReg) {
    logger.log('[pushService] Firebase messaging service worker already registered, scope:', existingFCMReg.scope);
    return existingFCMReg;
  }
  
  // Register the service worker if not already registered
  // CRITICAL: On Safari/iOS, we MUST specify the scope explicitly to prevent
  // scope mismatch issues that cause token regeneration
  logger.log('[pushService] No Firebase messaging service worker found, registering now...');
  try {
    // Use explicit scope that matches the SW file location
    // This prevents Safari from creating scope mismatches
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope'
    });
    logger.log('[pushService] Service worker registered successfully, scope:', registration.scope);
    return registration;
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
      // First, ensure the service worker is registered (and get the registration)
      const existingReg = await ensureServiceWorkerRegistered();
      
      // If we got a registration with an active worker, use it directly
      if (existingReg?.active) {
        logger.log('[pushService] Using existing service worker registration');
        swIsReady = true;
        return existingReg;
      }

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

// Progress callback type for UI feedback during push setup
type ProgressCallback = (step: string, detail?: string) => void;

const requestPermissionAndGetToken = async (onProgress?: ProgressCallback): Promise<string> => {
  if (!('Notification' in window)) throw new Error('Notifications are not supported in this browser');
  
  onProgress?.('Requesting permission...', 'Please allow notifications when prompted');
  logger.log('[pushService] Requesting notification permission');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission not granted');

  onProgress?.('Permission granted', 'Preparing notification service...');

  if (!VAPID_KEY) throw new Error('Missing VAPID key. Set VITE_FIREBASE_VAPID_KEY in your environment.');

  // Use our initialized messaging instance which has VAPID key set early (Safari fix)
  const messaging = await getInitializedMessaging();
  
  // Wait for service worker to be ready before attempting to get token
  // This prevents "no active Service Worker" errors on first page load
  onProgress?.('Preparing service worker...', 'Setting up background notifications');
  const registration = await waitForServiceWorkerReady();
  
  if (!registration) {
    throw new Error('Service worker registration not available');
  }
  
  logger.log('[pushService] Service worker ready, scope:', registration.scope);
  logger.log('[pushService] Service worker state:', registration.active?.state);
  onProgress?.('Service worker ready', 'Verifying push capability...');
  
  // On iOS, verify we can access PushManager before attempting FCM token
  // This provides better error messages if the PWA isn't properly installed
  if (isIOSDevice()) {
    logger.log('[pushService] iOS detected, verifying PushManager access...');
    onProgress?.('Verifying iOS push access...', 'Checking Apple Push service');
    
    try {
      // Check if PushManager is available on the registration
      if (!registration.pushManager) {
        throw new Error('PushManager not available. Make sure you opened this app from the Home Screen.');
      }
      
      // Try to get existing subscription to verify PushManager works
      const existingSubscription = await registration.pushManager.getSubscription();
      logger.log('[pushService] iOS PushManager accessible, existing subscription:', !!existingSubscription);
      
      // Note: We don't do a pre-flight subscription test here because:
      // 1. FCM uses its own subscription endpoint which may differ from a raw subscribe()
      // 2. The test subscription could interfere with FCM's token generation
      // 3. We have retry logic in getToken() that handles transient failures
    } catch (pmError) {
      const errMsg = pmError instanceof Error ? pmError.message : String(pmError);
      logger.error('[pushService] iOS PushManager access failed:', errMsg);
      
      // Re-throw our custom errors
      if (errMsg.includes('Unable to connect') || errMsg.includes('PushManager not available') || errMsg.includes('Home Screen')) {
        throw pmError;
      }
      
      // Provide helpful error messages based on the failure
      if (errMsg.toLowerCase().includes('not allowed') || errMsg.toLowerCase().includes('permission')) {
        throw new Error('Push notifications not allowed. Please ensure the app is opened from your Home Screen.');
      }
      throw new Error('Push notifications are not available. Please open this app from your Home Screen (not Safari).');
    }
  }
  
  logger.log('[pushService] Obtaining FCM token with VAPID key and service worker registration');
  onProgress?.('Connecting to notification server...', isIOSDevice() ? 'This may take a moment on iOS' : undefined);
  
  // On iOS, the first getToken() call often fails with "Load failed" due to iOS Safari's
  // aggressive network timeout behavior when communicating with Apple's push service (APNs).
  // We use multiple retries with increasing delays to handle this.
  let token: string | null = null;
  let lastError: Error | null = null;
  const maxAttempts = isIOSDevice() ? 6 : 2; // More retries on iOS
  
  // On iOS, add an initial delay to let the network stack fully initialize
  // This is especially important right after the permission dialog closes
  if (isIOSDevice()) {
    logger.log('[pushService] iOS: Adding initial delay before FCM token request...');
    onProgress?.('Initializing iOS push service...', 'Please wait...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.log(`[pushService] getToken attempt ${attempt}/${maxAttempts}`);
      
      if (isIOSDevice()) {
        onProgress?.(`Connecting to Apple Push service...`, `Attempt ${attempt} of ${maxAttempts}`);
      }
      
      // Add delay before retries (not before first attempt since we already delayed on iOS)
      if (attempt > 1) {
        // Longer delays for iOS: 2s, 3s, 4.5s, 6s, 8s
        const delay = isIOSDevice() 
          ? 2000 * Math.pow(1.4, attempt - 2) 
          : 1500 * Math.pow(1.5, attempt - 2);
        logger.log(`[pushService] Waiting ${Math.round(delay)}ms before retry...`);
        
        if (isIOSDevice()) {
          onProgress?.(`Retrying connection...`, `Waiting ${Math.round(delay / 1000)}s before attempt ${attempt}`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // On iOS after 2 failed attempts, try clearing any stale token state
        if (isIOSDevice() && attempt === 3) {
          logger.log('[pushService] iOS: Attempting to clear stale token state...');
          onProgress?.('Clearing stale data...', 'Resetting push registration');
          try {
            await deleteToken(messaging);
            logger.log('[pushService] iOS: Token state cleared');
          } catch (delErr) {
            logger.warn('[pushService] iOS: Could not clear token (may not exist):', delErr);
          }
          // Extra delay after clearing
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      token = await getToken(messaging, { 
        vapidKey: VAPID_KEY, 
        serviceWorkerRegistration: registration 
      });
      
      if (token) {
        logger.log(`[pushService] getToken succeeded on attempt ${attempt}`);
        onProgress?.('Connection established!', 'Finalizing setup...');
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errMsg = lastError.message.toLowerCase();
      
      logger.warn(`[pushService] getToken attempt ${attempt} failed:`, lastError.message);
      
      // Check if this is a retryable error
      const isRetryable = errMsg.includes('load failed') || 
                          errMsg.includes('network') || 
                          errMsg.includes('timeout') || 
                          errMsg.includes('failed to fetch') ||
                          errMsg.includes('aborted');
      
      if (isRetryable && attempt < maxAttempts) {
        logger.log(`[pushService] Retryable error, will attempt again...`);
        if (isIOSDevice()) {
          onProgress?.(`Connection attempt ${attempt} failed`, `Will retry... (${maxAttempts - attempt} attempts left)`);
        }
        continue;
      }
      
      // All retries exhausted or non-retryable error
      if (isRetryable) {
        throw new Error('Unable to connect to notification service. Please ensure you have a stable internet connection and try again.');
      }
      throw lastError;
    }
  }
  
  if (!token) {
    throw lastError || new Error('Failed to obtain messaging token');
  }
  
  logger.log('[pushService] Obtained FCM token:', token.substring(0, 20) + '...');
  onProgress?.('Push notifications configured!', 'Registering with server...');
  return token;
};

/**
 * Convert a base64 VAPID key to Uint8Array for use with PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const registerTokenOnServer = async (token: string): Promise<RegisterResult> => {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'registerPushToken');
  try {
    logger.log('[pushService] Calling registerPushToken callable');
    // Use more attempts on iOS since Safari can fail with "Load failed" on first attempts
    const attempts = isIOSDevice() ? 5 : 3;
    const res = await withRetry(() => fn({ token }), { 
      attempts, 
      shouldRetry: isNetworkError,
      initialDelayMs: isIOSDevice() ? 500 : 300  // Longer delay on iOS
    });
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
    // Use more attempts on iOS since Safari can fail with "Load failed" on first attempts
    const attempts = isIOSDevice() ? 5 : 3;
    const res = await withRetry(() => fn({ enabled }), { 
      attempts, 
      shouldRetry: isNetworkError,
      initialDelayMs: isIOSDevice() ? 500 : 300  // Longer delay on iOS
    });
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
  // 
  // IMPORTANT: On iOS, Web Push is only supported when:
  // 1. iOS version is 16.4 or later
  // 2. The app is running in Safari
  // 3. The app is installed as a PWA (added to Home Screen)
  isPushSupported(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      if (!('Notification' in window)) return false;
      if (!isSupported()) return false;
      
      // On iOS, we need additional checks
      if (isIOSDevice()) {
        const status = getIOSWebPushStatus();
        // Only return true if all iOS requirements are met
        return status.canUsePush;
      }
      
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Get detailed iOS Web Push status for UI messaging.
   * Returns the status object with actionable information for the user.
   */
  getIOSPushStatus(): IOSWebPushStatus {
    return getIOSWebPushStatus();
  },

  /**
   * Check if running on iOS device.
   */
  isIOS(): boolean {
    return isIOSDevice();
  },

  /**
   * Check if the app is running as an installed PWA (standalone mode).
   */
  isInstalledPWA(): boolean {
    return isStandaloneMode();
  },
  
  /**
   * Enable push notifications with optional progress callback for UI feedback.
   * On iOS, the progress callback provides real-time status updates during the
   * potentially lengthy token acquisition process.
   */
  async enablePush(onProgress?: (step: string, detail?: string) => void): Promise<RegisterResult> {
    try {
      logger.log('[pushService] enablePush invoked');
      const token = await requestPermissionAndGetToken(onProgress);
      logger.log('[pushService] enablePush obtained token, registering on server');
      onProgress?.('Registering with server...', 'Almost done!');
      const server = await registerTokenOnServer(token);
      onProgress?.('Setup complete!', undefined);
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
      if (!VAPID_KEY) return null;
      
      // Use our initialized messaging instance (Safari fix)
      const messaging = await getInitializedMessaging();
      
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
   * Also initializes messaging with VAPID key (Safari fix).
   */
  async preWarmServiceWorker(): Promise<void> {
    if (!this.isPushSupported()) return;
    
    try {
      logger.log('[pushService] Pre-warming service worker and messaging...');
      // Initialize messaging early with VAPID key (Safari fix)
      await getInitializedMessaging();
      // This will register and wait for activation, caching the result
      await waitForServiceWorkerReady();
      logger.log('[pushService] Service worker pre-warmed successfully');
    } catch (err) {
      // Non-fatal - user can still enable push later
      logger.warn('[pushService] Pre-warm failed (non-fatal):', err);
    }
  },

  /**
   * Initialize messaging early with VAPID key set.
   * Call this as early as possible (e.g., after Firebase app init) on Safari/iOS
   * to prevent token invalidation issues when Firebase Functions are used.
   */
  async initializeMessagingEarly(): Promise<void> {
    try {
      await getInitializedMessaging();
      logger.log('[pushService] Messaging initialized early with VAPID key');
    } catch (err) {
      logger.warn('[pushService] Early messaging init failed (non-fatal):', err);
    }
  },

  onMessage(handler: (payload: any) => void) {
    try {
      // Use async initialization but return sync for compatibility
      getInitializedMessaging().then(messaging => {
        onMessage(messaging, (payload_) => handler(payload_));
      }).catch(err => {
        logger.warn('[pushService] onMessage setup failed:', err);
      });
      return () => {}; // Return unsubscribe placeholder
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
