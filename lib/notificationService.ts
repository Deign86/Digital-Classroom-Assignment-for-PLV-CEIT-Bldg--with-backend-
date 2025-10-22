import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { getFirebaseDb, getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type NotificationType = 'approved' | 'rejected' | 'info';

export type Notification = {
  id: string;
  userId: string; // faculty user id who receives this notification
  type: NotificationType;
  message: string;
  bookingRequestId?: string;
  adminFeedback?: string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type FirestoreNotificationRecord = Omit<Notification, 'id'>;

const COLLECTION = 'notifications';

const db = () => getFirebaseDb();
const nowIso = () => new Date().toISOString();

const normalizeTimestamp = (val: any): string | null => {
  if (val == null) return null;
  // Firestore Timestamp object has toDate()
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  // If it's already an ISO string or number
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return new Date(val).toISOString();
  return null;
};

const toNotification = (id: string, data: FirestoreNotificationRecord): Notification => ({
  id,
  userId: data.userId,
  type: data.type,
  message: data.message,
  bookingRequestId: data.bookingRequestId,
  adminFeedback: data.adminFeedback,
  acknowledgedBy: data.acknowledgedBy ?? null,
  acknowledgedAt: normalizeTimestamp(data.acknowledgedAt),
  createdAt: normalizeTimestamp(data.createdAt) ?? nowIso(),
  updatedAt: normalizeTimestamp(data.updatedAt) ?? nowIso(),
});

export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  options?: { bookingRequestId?: string; adminFeedback?: string }
): Promise<string> => {
  // Use a callable Cloud Function to create notifications server-side
  const app = getFirebaseApp();
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'createNotification');
  const payload = {
    userId,
    type,
    message,
    bookingRequestId: options?.bookingRequestId,
    adminFeedback: options?.adminFeedback,
  };

  const result = await fn(payload);
  const anyResult = result as any;
  const id = anyResult?.data?.id;
  if (!id) {
    throw new Error('Notification creation failed: no id returned');
  }
  return id as string;
};

export const acknowledgeNotification = async (id: string, acknowledgedBy: string): Promise<void> => {
  // Use a server-side callable to ensure server timestamps and enforce permissions
  const app = getFirebaseApp();
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'acknowledgeNotification');
  const result = await fn({ notificationId: id });
  const anyResult = result as any;
  if (!anyResult?.data?.success) {
    throw new Error('Failed to acknowledge notification');
  }
};

export const getNotificationById = async (id: string): Promise<Notification | null> => {
  const database = db();
  const ref = doc(database, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreNotificationRecord;
  return toNotification(snap.id, data);
};

export const getUnreadCount = async (userId?: string): Promise<number> => {
  const database = db();
  // Firestore allows querying for null equality
  const notificationsRef = collection(database, COLLECTION);
  let q;
  if (userId) {
    q = query(notificationsRef, where('userId', '==', userId), where('acknowledgedAt', '==', null));
  } else {
    q = query(notificationsRef, where('acknowledgedAt', '==', null));
  }
  const snapshot = await getDocs(q);
  return snapshot.size;
};

export const setupNotificationsListener = (
  callback: (items: Notification[]) => void,
  errorCallback?: (error: Error) => void,
  userId?: string
) => {
  const database = db();
  const notificationsRef = collection(database, COLLECTION);

  let q;
  if (userId) {
    q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  } else {
    q = query(notificationsRef, orderBy('createdAt', 'desc'));
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      try {
        const items = snapshot.docs.map((d) => {
          const data = d.data() as FirestoreNotificationRecord;
          return toNotification(d.id, data);
        });
        callback(items);
      } catch (err) {
        console.error('Notifications listener error:', err);
        errorCallback?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      console.error('Notifications listener error (snapshot):', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  );

  return unsubscribe;
};

export const notificationService = {
  createNotification,
  acknowledgeNotification,
  getNotificationById,
  getUnreadCount,
  setupNotificationsListener,
};

export default notificationService;
