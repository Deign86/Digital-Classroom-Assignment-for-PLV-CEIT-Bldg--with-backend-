/**
 * Lazy-loaded push service wrapper to defer Firebase Messaging imports.
 * This reduces the initial bundle size and improves LCP by only loading
 * Firebase Messaging when needed (after user login).
 */

import { logger } from './logger';

// Type-only imports don't affect bundle
type PushService = typeof import('./pushService').pushService;

let pushServiceInstance: PushService | null = null;
let loadingPromise: Promise<PushService> | null = null;

/**
 * Lazily loads and returns the push service.
 * Multiple calls during loading will return the same promise.
 */
async function loadPushService(): Promise<PushService> {
  if (pushServiceInstance) {
    return pushServiceInstance;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      logger.log('[pushServiceLazy] Loading Firebase Messaging module...');
      const module = await import('./pushService');
      pushServiceInstance = module.pushService;
      logger.log('[pushServiceLazy] Firebase Messaging module loaded successfully');
      return pushServiceInstance;
    } catch (error) {
      logger.error('[pushServiceLazy] Failed to load push service:', error);
      loadingPromise = null; // Reset so we can retry
      throw error;
    }
  })();

  return loadingPromise;
}

type RegisterResult = { success: boolean; token?: string; message?: string };

/**
 * Lazy wrapper for push service methods.
 * All methods defer loading until actually called.
 */
export const pushServiceLazy = {
  async isPushSupported(): Promise<boolean> {
    const service = await loadPushService();
    return service.isPushSupported();
  },

  async enablePush(): Promise<RegisterResult> {
    const service = await loadPushService();
    return service.enablePush();
  },

  async disablePush(token?: string): Promise<RegisterResult> {
    const service = await loadPushService();
    return service.disablePush(token);
  },

  async setPushEnabledOnServer(enabled: boolean): Promise<any> {
    const service = await loadPushService();
    return service.setPushEnabledOnServer(enabled);
  },

  async sendTestNotification(token: string, title?: string, body?: string): Promise<any> {
    const service = await loadPushService();
    return service.sendTestNotification(token, title, body);
  },

  async getCurrentToken(): Promise<string | null> {
    const service = await loadPushService();
    return service.getCurrentToken();
  },

  onMessage(handler: (payload: any) => void): () => void {
    // For onMessage, we need to load immediately when called
    // Return a placeholder unsubscribe function until loaded
    let unsubscribe: (() => void) | null = null;
    
    loadPushService().then(service => {
      unsubscribe = service.onMessage(handler);
    }).catch(error => {
      logger.error('[pushServiceLazy] Failed to setup message listener:', error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  },

  /**
   * Preload the push service without waiting for it.
   * Call this after LCP to start loading in the background.
   */
  preload(): void {
    if (!pushServiceInstance && !loadingPromise) {
      logger.log('[pushServiceLazy] Preloading push service...');
      loadPushService().catch(() => {
        // Ignore errors during preload
      });
    }
  }
};

// Expose lazy service for dev debugging
if (import.meta.env.DEV) {
  (window as any).pushServiceLazy = pushServiceLazy;
}
