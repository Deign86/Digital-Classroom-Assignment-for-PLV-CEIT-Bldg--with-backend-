import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb, getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type ClientErrorRecord = {
  message: string;
  stack?: string | null;
  info?: any;
  url?: string;
  userAgent?: string;
  userId?: string | null;
  createdAt?: any;
};

const COLLECTION = 'clientErrorLogs';

/**
 * Attempt to use a callable Cloud Function to log client errors. If the function
 * is not available (or calling it fails), fall back to writing directly to Firestore.
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
    console.warn('logClientError cloud function failed or unavailable, falling back to client-side write:', fnErr);
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
    console.error('Failed to write client error log (fallback):', err);
    return null;
  }
}

export default { logClientError };
