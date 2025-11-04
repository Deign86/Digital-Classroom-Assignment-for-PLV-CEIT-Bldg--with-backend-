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
import { getAuth } from 'firebase/auth';
import { getFirebaseDb, getFirebaseApp } from './firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import withRetry, { isNetworkError } from './withRetry';
import { logger } from './logger';

/**
 * Types of notifications that can be sent to users
 */
export type NotificationType = 'approved' | 'rejected' | 'info' | 'cancelled' | 'signup';

/**
 * Represents a notification in the system
 */
export type Notification = {
  /** Unique notification identifier */
  id: string;
  /** ID of the faculty user who receives this notification */
  userId: string;
  /** Type of notification */
  type: NotificationType;
  /** Notification message text */
  message: string;
  /** Associated booking request ID (if applicable) */
  bookingRequestId?: string;
  /** Admin feedback or reason (for approvals/rejections) */
  adminFeedback?: string;
  /** ID of user who acknowledged the notification */
  acknowledgedBy?: string | null;
  /** Timestamp when notification was acknowledged */
  acknowledgedAt?: string | null;
  /** Timestamp when notification was created */
  createdAt: string;
  /** Timestamp when notification was last updated */
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

/**
 * Creates a new notification for a user.
 * 
 * Uses a Cloud Function for server-side creation to ensure security and
 * proper timestamp handling. Automatically prevents self-notifications
 * when actor and recipient are the same user.
 * 
 * @param userId - ID of the user to receive the notification
 * @param type - Type of notification being created
 * @param message - Notification message text
 * @param options - Optional parameters
 * @param options.bookingRequestId - Associated booking request ID
 * @param options.adminFeedback - Admin feedback or reason
 * @param options.actorId - ID of user performing the action (to prevent self-notifications)
 * @returns The created notification ID, or null if skipped (e.g., self-notification)
 * @throws Error if notification creation fails
 * 
 * @example
 * ```typescript
 * // Create approval notification
 * await createNotification(
 *   facultyId,
 *   'approved',
 *   'Your booking request was approved',
 *   { bookingRequestId: request.id, actorId: adminId }
 * );
 * ```
 */
export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  options?: { bookingRequestId?: string; adminFeedback?: string; actorId?: string }
): Promise<string | null> => {
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
    actorId: options?.actorId,
  };

  const result = await withRetry(() => fn(payload), { attempts: 3, shouldRetry: isNetworkError });
  const anyResult = result as any;
  const id = anyResult?.data?.id ?? null;
  // If the server skipped creation because actor === recipient, it returns skipped:true and id === null
  if (anyResult?.data?.skipped) return null;
  if (!id) {
    throw new Error('Notification creation failed: no id returned');
  }
  return id as string;
};

/**
 * Marks a single notification as acknowledged by a user.
 * 
 * Uses a server-side Cloud Function to ensure proper timestamp handling
 * and permission enforcement.
 * 
 * @param id - The notification ID to acknowledge
 * @param acknowledgedBy - ID of the user acknowledging the notification
 * @throws Error if acknowledgment fails or notification doesn't exist
 * 
 * @example
 * ```typescript
 * await acknowledgeNotification(notificationId, currentUser.id);
 * ```
 */
export const acknowledgeNotification = async (id: string, acknowledgedBy: string): Promise<void> => {
  // Use a server-side callable to ensure server timestamps and enforce permissions
  const app = getFirebaseApp();
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'acknowledgeNotification');
  const result = await withRetry(() => fn({ notificationId: id }), { attempts: 3, shouldRetry: isNetworkError });
  const anyResult = result as any;
  if (!anyResult?.data?.success) {
    throw new Error('Failed to acknowledge notification');
  }
};

/**
 * Marks multiple notifications as acknowledged in a single operation.
 * 
 * More efficient than calling acknowledgeNotification repeatedly.
 * Uses a server-side Cloud Function for atomic batch operations.
 * 
 * @param ids - Array of notification IDs to acknowledge
 * @param acknowledgedBy - ID of the user acknowledging the notifications
 * @returns The new unread notification count for the user
 * @throws Error if batch acknowledgment fails
 * 
 * @example
 * ```typescript
 * const unreadCount = await acknowledgeNotifications(
 *   ['notif1', 'notif2', 'notif3'],
 *   currentUser.id
 * );
 * ```
 */
export const acknowledgeNotifications = async (ids: string[], acknowledgedBy: string): Promise<number> => {
  // Prefer a server-side callable that can acknowledge many notifications in one atomic operation
  const app = getFirebaseApp();
  const functions = getFunctions(app);
  const fn = httpsCallable(functions, 'acknowledgeNotifications');
  const result = await withRetry(() => fn({ notificationIds: ids }), { attempts: 3, shouldRetry: isNetworkError });
  const anyResult = result as any;
  if (!anyResult?.data?.success) {
    throw new Error('Failed to acknowledge notifications');
  }
  // Optionally the function returns the new unread count for the user
  return typeof anyResult?.data?.unreadCount === 'number' ? anyResult.data.unreadCount : 0;
};

/**
 * Retrieves a single notification by its ID.
 * 
 * @param id - The notification ID to fetch
 * @returns The notification object, or null if not found
 * 
 * @example
 * ```typescript
 * const notification = await getNotificationById('notif123');
 * if (notification) {
 *   console.log(notification.message);
 * }
 * ```
 */
export const getNotificationById = async (id: string): Promise<Notification | null> => {
  const database = db();
  const ref = doc(database, COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as FirestoreNotificationRecord;
  return toNotification(snap.id, data);
};

/**
 * Gets the count of unread notifications for a specific user.
 * 
 * @param userId - The user ID to check unread count for
 * @returns Number of unread notifications
 * 
 * @example
 * ```typescript
 * const unreadCount = await getUnreadCount(currentUser.id);
 * setBadgeCount(unreadCount);
 * ```
 */
export const getUnreadCount = async (userId: string): Promise<number> => {
  const database = db();
  // Firestore allows querying for null equality
  const notificationsRef = collection(database, COLLECTION);
  const q = query(notificationsRef, where('userId', '==', userId), where('acknowledgedAt', '==', null));
  const snapshot = await getDocs(q);
  return snapshot.size;
};

/**
 * Sets up a real-time listener for notifications.
 * 
 * Receives automatic updates when notifications are created, modified, or deleted.
 * The listener should be unsubscribed when no longer needed to prevent memory leaks.
 * 
 * @param callback - Function called with updated notifications array
 * @param errorCallback - Optional function called when errors occur
 * @param userId - Optional user ID to filter notifications (if omitted, returns all)
 * @returns Unsubscribe function to stop listening
 * 
 * @example
 * ```typescript
 * const unsubscribe = setupNotificationsListener(
 *   (notifications) => {
 *     setNotifications(notifications);
 *     setUnreadCount(notifications.filter(n => !n.acknowledgedAt).length);
 *   },
 *   (error) => console.error('Listener error:', error),
 *   currentUser.id
 * );
 * 
 * // Later: cleanup
 * return () => unsubscribe();
 * ```
 */
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

  // Log the project and current auth user to help diagnose local vs prod permission issues
  try {
    const app = getFirebaseApp();
    try {
      const auth = getAuth(app);
      logger.log('setupNotificationsListener registering', { projectId: app.options?.projectId, currentUser: auth.currentUser?.uid ?? null });
    } catch (e) {
      logger.log('setupNotificationsListener: unable to read auth currentUser', e);
    }
  } catch (e) {
    logger.log('setupNotificationsListener: unable to read firebase app info', e);
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
        logger.error('Notifications listener error:', err);
        errorCallback?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      logger.error('Notifications listener error (snapshot):', error);
      // Do NOT call unsubscribe() from inside the SDK error callback — calling
      // the returned unsubscribe here can cause internal SDK race conditions
      // and assertions. Forward the error to the caller and let the higher
      // level (or central listener manager) handle teardown.
      const err = error instanceof Error ? error : new Error(String(error));
      errorCallback?.(err);
    }
  );

  return unsubscribe;
};

/**
 * Complete notification service interface.
 * 
 * Provides all functions needed for managing in-app notifications
 * including creation, acknowledgment, and real-time updates.
 */
export const notificationService = {
  createNotification,
  acknowledgeNotification,
  acknowledgeNotifications,
  getNotificationById,
  getUnreadCount,
  setupNotificationsListener,
};

export default notificationService;
