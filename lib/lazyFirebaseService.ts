/*
  Lazy Firebase service loader

  Purpose: avoid importing the full `firebaseService` at module evaluation time so
  the Firebase SDK (especially Firestore realtime listeners) doesn't become part
  of the initial critical path. This module exposes a small synchronous shim for
  `onAuthStateChange` (so code can register auth listeners synchronously) and
  async proxies for other services. Methods on proxied services return Promises
  (they await the real implementation when first used).

  Notes:
  - The shim registers callbacks locally and wires them to the real service once
    the concrete `firebaseService` module finishes loading.
  - This is a targeted, low-risk change to reduce initial bundle evaluation and
    network connections created during page load.
*/

type Unsub = { unsubscribe: () => void };

let loadedModule: any = null;
let loadingPromise: Promise<void> | null = null;

async function loadModule() {
  if (loadedModule) return loadedModule;
  if (!loadingPromise) {
    loadingPromise = import('./firebaseService').then((m) => {
      loadedModule = m;
    }).catch((e) => {
      // swallow - caller should handle errors when awaiting real calls
      console.error('Failed to load firebaseService lazily:', e);
    });
  }
  await loadingPromise;
  return loadedModule;
}

// --- Auth shim that allows synchronous registration ---
type AuthCallback = (user: any) => void;
type AuthErrorCallback = (err?: any) => void;

const pendingAuthRegistrations: Array<{ cb: AuthCallback; err?: AuthErrorCallback }> = [];
const realAuthUnsubs = new Map<AuthCallback, Unsub>();

export const authService = {
  onAuthStateChange(cb: AuthCallback, errCb?: AuthErrorCallback) {
    // Keep registration locally so callers get a synchronous subscription object
    pendingAuthRegistrations.push({ cb, err: errCb });

    // Kick off module load (async) but don't await here
    loadModule().then((mod) => {
      try {
        // Wire up any pending registrations to the real authService
        for (const reg of pendingAuthRegistrations) {
          try {
            const result = mod.authService.onAuthStateChange(reg.cb, reg.err);
            const unsub = result?.data?.subscription as Unsub | undefined;
            if (unsub) realAuthUnsubs.set(reg.cb, unsub);
          } catch (e) {
            console.error('Error wiring auth callback to real service:', e);
          }
        }
        pendingAuthRegistrations.length = 0;
      } catch (e) {
        console.error('lazyFirebaseService: failed during auth wiring', e);
      }
    }).catch(() => {/* ignore */});

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            // If real service already provided an unsubscribe, call it.
            const real = realAuthUnsubs.get(cb);
            if (real) {
              try { real.unsubscribe(); } catch (e) { /* ignore */ }
              realAuthUnsubs.delete(cb);
              return;
            }

            // Otherwise remove from pending registrations
            for (let i = 0; i < pendingAuthRegistrations.length; i++) {
              if (pendingAuthRegistrations[i].cb === cb) {
                pendingAuthRegistrations.splice(i, 1);
                break;
              }
            }
          }
        }
      }
    } as any;
  }
};

// Proxy common auth methods to the real module so callers can `await` them.
const authProxyMethods = [
  'signIn',
  'getCurrentUser',
  'registerFaculty',
  'signOut',
  'signOutDueToIdleTimeout',
  'isAuthenticated'
] as const;

for (const name of authProxyMethods) {
  // @ts-ignore - dynamic assignment
  (authService as any)[name] = async (...args: any[]) => {
    const mod = await loadModule();
    if (!mod) throw new Error('firebaseService failed to load');
    const fn = mod.authService?.[name as string];
    if (typeof fn !== 'function') {
      throw new Error(`authService.${String(name)} is not available on real module`);
    }
    return fn.apply(mod.authService, args);
  };
}

// Utility to create a proxy that lazily loads the module and forwards calls.
function createLazyServiceProxy(serviceName: string) {
  return new Proxy({}, {
    get(_, prop: string) {
      return async (...args: any[]) => {
        const mod = await loadModule();
        if (!mod) throw new Error('firebaseService failed to load');
        const svc = mod[serviceName];
        if (!svc) throw new Error(`${serviceName} not found on firebaseService`);
        const fn = svc[prop as keyof typeof svc];
        if (typeof fn !== 'function') {
          // Return property value (non-function)
          return (svc as any)[prop];
        }
        return fn.apply(svc, args);
      };
    }
  }) as any;
}

export const userService = createLazyServiceProxy('userService');
export const classroomService = createLazyServiceProxy('classroomService');
export const signupRequestService = createLazyServiceProxy('signupRequestService');
export const signupHistoryService = createLazyServiceProxy('signupHistoryService');
export const bookingRequestService = createLazyServiceProxy('bookingRequestService');
export const scheduleService = createLazyServiceProxy('scheduleService');
export const realtimeService = createLazyServiceProxy('realtimeService');

export default {
  authService,
  userService,
  classroomService,
  signupRequestService,
  signupHistoryService,
  bookingRequestService,
  scheduleService,
  realtimeService,
};
