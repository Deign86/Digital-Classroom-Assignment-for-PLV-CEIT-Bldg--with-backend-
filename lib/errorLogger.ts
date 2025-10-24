import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebaseConfig';

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

export async function logClientError(payload: Omit<ClientErrorRecord, 'createdAt'>): Promise<string | null> {
  try {
    const db = getFirebaseDb();
    const ref = collection(db, COLLECTION);
    const doc = await addDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return doc.id;
  } catch (err) {
    // If logging fails, don't block the app — print to console and return null
    console.error('Failed to write client error log:', err);
    return null;
  }
}

export default { logClientError };
