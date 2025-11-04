import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from './logger';

/**
 * Represents a client-side error record stored in Firestore
 */
export type ClientErrorRecord = {
  /** Error message */
  message: string;
  /** Stack trace of the error (if available) */
  stack?: string | null;
  /** Additional error context or metadata */
  info?: any;
  /** URL where the error occurred */
  url?: string;
  /** Browser user agent string */
  userAgent?: string;
  /** ID of the user who encountered the error */
  userId?: string | null;
  /** Server timestamp when the error was logged */
  createdAt?: any;
};

const COLLECTION = 'clientErrorLogs';

/**
 * Logs a client-side error to Firestore for monitoring and debugging.
 * 
 * First attempts to use a Cloud Function for server-side logging with enhanced
 * security and validation. If the function is unavailable or fails, falls back
 * to direct Firestore write for reliability.
 * 
 * @param payload - Error information to log (excludes createdAt which is set server-side)
 * @returns The document ID of the logged error, or null if logging failed
 * 
 * @example
 * ```typescript
 * try {
 *   // Some code that might fail
 * } catch (error) {
 *   await logClientError({
 *     message: error.message,
 *     stack: error.stack,
 *     url: window.location.href,
 *     userId: currentUser?.id
 *   });
 * }
 * ```
 */
export async function logClientError(payload: Omit<ClientErrorRecord, 'createdAt'>): Promise<string | null> {
  // First attempt: call server-side function if available
  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app);
    const fn = httpsCallable(functions, 'logClientError');
    const res = await fn(payload as any);
    const anyRes = res as any;
    if (anyRes?.data?.id) return anyRes.data.id as string;
  } catch (fnErr) {
    // Not critical — we'll fall back to direct Firestore write below
    logger.warn('logClientError cloud function failed or unavailable, falling back to client-side write:', fnErr);
  }

  // Fallback: write directly to Firestore (best-effort)
  try {
    const db = getFirebaseDb();
    const ref = collection(db, COLLECTION);
    const docRef = await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    // If logging fails, don't block the app — print to console and return null
    logger.error('Failed to write client error log (fallback):', err);
    return null;
  }
}

export default { logClientError };
