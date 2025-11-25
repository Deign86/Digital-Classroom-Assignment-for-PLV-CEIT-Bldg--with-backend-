import { scheduler } from 'firebase-functions/v2';

// Local typed shape matching firebase-functions v2 ScheduledEvent
type ScheduledEventLike = {
  jobName?: string;
  scheduleTime: string;
};
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import type { QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';

// Initialize firebase-admin. Prefer an explicit service account when provided via
// environment to support local runs or pinned credentials. The code supports two
// inputs:
// - FIREBASE_ADMIN_SA_JSON: the full service account JSON string
// - FIREBASE_ADMIN_SA_PATH: a filesystem path to a service account JSON file
// - GOOGLE_APPLICATION_CREDENTIALS is also respected as a path fallback
// If none are provided, fall back to the default ADC behavior used by Cloud
// Functions (recommended in production).
let db: admin.firestore.Firestore;
try {
  const saJson = process.env.FIREBASE_ADMIN_SA_JSON;
  const saPath = process.env.FIREBASE_ADMIN_SA_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (saJson) {
    try {
      const serviceAccount = JSON.parse(saJson) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.info('Initialized firebase-admin using FIREBASE_ADMIN_SA_JSON env var');
    } catch (e) {
      console.error('Failed to parse FIREBASE_ADMIN_SA_JSON, falling back to default credentials:', e);
      admin.initializeApp();
    }
  } else if (saPath && fs.existsSync(saPath)) {
    try {
      const raw = fs.readFileSync(saPath, 'utf8');
      const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.info(`Initialized firebase-admin using service account file at ${saPath}`);
    } catch (e) {
      console.error(`Failed to read/parse service account at ${saPath}, falling back to default credentials:`, e);
      admin.initializeApp();
    }
  } else {
    // Default ADC (Cloud Functions will use the attached service account)
    admin.initializeApp();
    console.info('Initialized firebase-admin using default application credentials');
  }
  db = admin.firestore();
} catch (initErr) {
  // Extremely defensive: try to initialize with default creds if anything unexpected happens
  console.error('Unexpected error initializing firebase-admin, attempting default init:', initErr);
  try {
    admin.initializeApp();
    db = admin.firestore();
  } catch (e) {
    console.error('Final firebase-admin initialization attempt failed:', e);
    throw e;
  }
}

// Minimal local types to avoid casting to `any` in a few server-side helpers
type DeletionLockDoc = { locked?: boolean; lockedBy?: string; timestamp?: number };
type BookingDocData = { date?: string; startTime?: string; endTime?: string; startAt?: any };

// Scheduled Cloud Function: run daily to expire pending booking requests whose start time is in the past
export const expirePastPendingBookings = scheduler.onSchedule(
  // Run hourly to reduce lag between a booking expiring and the UI reflecting that status
  { schedule: '0 * * * *', timeZone: 'Etc/UTC' },
  async (event: ScheduledEventLike) => {
    const now = admin.firestore.Timestamp.now();

    // IMPORTANT: Prefer a proper timestamp field (startAt) on booking requests. This function
    // handles both timestamp and legacy string-based (date/startTime) formats conservatively.
    const snapshot = await db.collection('bookingRequests')
      .where('status', '==', 'pending')
      .get();

    const batch = db.batch();
    let changed = 0;

  snapshot.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();

      // If explicit timestamp exists, use it
      let startTs: admin.firestore.Timestamp | null = null;
      if (data.startAt && data.startAt._seconds) {
        // already a Firestore Timestamp-like object
        startTs = data.startAt as admin.firestore.Timestamp;
      } else if (data.startAt && data.startAt.seconds) {
        startTs = admin.firestore.Timestamp.fromMillis((data.startAt.seconds || 0) * 1000);
      } else if (data.date && data.startTime) {
        // Try to parse ISO-like strings. Expect date = 'YYYY-MM-DD' and startTime = 'HH:MM' or 'HH:MM:SS'
        try {
          const iso = `${data.date}T${data.startTime}`;
          const parsed = new Date(iso);
          if (!isNaN(parsed.getTime())) {
            startTs = admin.firestore.Timestamp.fromDate(parsed);
          }
        } catch (e) {
          // ignore parse errors
        }
      }

      if (!startTs) return;

      if (startTs.toMillis() < now.toMillis()) {
        batch.update(doc.ref, {
          status: 'expired',
          adminFeedback: 'Auto-expired: booking date/time has passed',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
          // Mark server as the actor for audit and to allow triggers to skip notifying a user acting via server
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'system',
        });
        changed++;
      }
    });

    if (changed > 0) {
      await batch.commit();
    }

  console.log(`Expire job ran. Marked ${changed} pending requests as expired.`);
    return;
  }
);

/**
 * Scheduled Cloud Function: run every hour to automatically re-enable classrooms
 * whose disable duration has expired
 */
export const autoReEnableDisabledClassrooms = scheduler.onSchedule(
  { schedule: '0 * * * *', timeZone: 'Etc/UTC' },
  async (event: ScheduledEventLike) => {
    const now = new Date().toISOString();
    
    logger.info('Auto re-enable job starting...');

    try {
      // Query all disabled classrooms that have a disabledUntil timestamp
      const snapshot = await db.collection('classrooms')
        .where('isAvailable', '==', false)
        .where('disabledUntil', '!=', null)
        .get();

      if (snapshot.empty) {
        logger.info('No classrooms with scheduled re-enable found');
        return;
      }

      const batch = db.batch();
      let reEnabled = 0;
      const reEnabledClassrooms: Array<{ id: string; name: string; reason?: string }> = [];

      snapshot.forEach((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const disabledUntil = data.disabledUntil as string;

        // Check if the disable duration has expired
        if (disabledUntil && disabledUntil <= now) {
          batch.update(doc.ref, {
            isAvailable: true,
            disabledUntil: admin.firestore.FieldValue.delete(),
            disableReason: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          reEnabledClassrooms.push({
            id: doc.id,
            name: data.name || 'Unknown',
            reason: data.disableReason as string | undefined
          });
          reEnabled++;
        }
      });

      if (reEnabled > 0) {
        await batch.commit();
        logger.info(`Re-enabled ${reEnabled} classroom(s)`);

        // Send notifications to admins about the re-enabled classrooms
        const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
        
        if (!adminsSnap.empty) {
          for (const classroom of reEnabledClassrooms) {
            const message = `Classroom "${classroom.name}" has been automatically re-enabled after its scheduled disable duration expired.`;
            
            // Notify all admins
            const notificationPromises = adminsSnap.docs.map(async (adminDoc) => {
              try {
                await persistAndSendNotification(
                  adminDoc.id,
                  'info',
                  message,
                  {
                    bookingRequestId: null,
                    adminFeedback: null,
                    actorId: 'system'
                  }
                );
              } catch (error) {
                logger.error(`Failed to notify admin ${adminDoc.id}:`, error);
              }
            });

            await Promise.allSettled(notificationPromises);
          }
        }

        logger.info(`Successfully re-enabled ${reEnabled} classroom(s): ${reEnabledClassrooms.map(c => c.name).join(', ')}`);
      } else {
        logger.info('No expired classroom disables found');
      }
    } catch (error) {
      logger.error('Error in autoReEnableDisabledClassrooms:', error);
    }
  }
);

/**
 * Scheduled Cloud Function: run daily to automatically clean up acknowledged notifications
 * that are older than 72 hours (3 days). This reduces database clutter while maintaining
 * a reasonable window for users to review acknowledged notifications.
 * 
 * BACKWARDS COMPATIBLE: Works with all notifications, including those acknowledged before
 * this function was deployed. Any notification with acknowledgedAt timestamp older than
 * 72 hours will be cleaned up.
 */
export const cleanupAcknowledgedNotifications = scheduler.onSchedule(
  // Run daily at 2 AM UTC to minimize impact during peak usage
  { schedule: '0 2 * * *', timeZone: 'Etc/UTC' },
  async (event: ScheduledEventLike) => {
    logger.info('Cleanup acknowledged notifications job starting...');

    try {
      const now = admin.firestore.Timestamp.now();
      const cutoffTime = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (72 * 60 * 60 * 1000) // 72 hours in milliseconds
      );

      // Query acknowledged notifications older than 72 hours
      // This query works for both newly acknowledged and pre-existing acknowledged notifications
      const snapshot = await db.collection('notifications')
        .where('acknowledgedAt', '!=', null)
        .where('acknowledgedAt', '<', cutoffTime)
        .get();

      if (snapshot.empty) {
        logger.info('No old acknowledged notifications found for cleanup');
        return;
      }

      // Use batched deletes to handle large volumes efficiently
      // Firestore batches support up to 500 operations
      const BATCH_SIZE = 500;
      let totalDeleted = 0;
      
      const deleteBatch = async (docs: QueryDocumentSnapshot[]) => {
        const batch = db.batch();
        docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return docs.length;
      };

      // Process deletions in batches
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batchDocs = docs.slice(i, i + BATCH_SIZE);
        const deleted = await deleteBatch(batchDocs);
        totalDeleted += deleted;
        logger.info(`Deleted batch of ${deleted} notifications (${totalDeleted}/${docs.length} total)`);
      }

      logger.info(`Successfully cleaned up ${totalDeleted} acknowledged notification(s) older than 72 hours`);
      return;
    } catch (error) {
      logger.error('Error in cleanupAcknowledgedNotifications:', error);
      throw error;
    }
  }
);

/**
 * Firebase Cloud Functions for PLV Classroom Assignment System
 * Provides admin-level user management capabilities using Firebase Admin SDK
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

// Constants for brute force protection
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Minimal typed wrapper for callable requests to improve editor/typechecking
type CallableRequest<T = any> = {
  auth?: { uid: string } | null;
  data?: T;
};

/**
 * Deletes a user's Firebase Auth account and all associated Firestore data
 * Only callable by authenticated admin users
 */
export const deleteUserAccount = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  // Verify the user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Get the calling user's data to verify admin role
  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore()
    .collection("users")
    .doc(callerUid)
    .get();

  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied",
      "Caller user data not found");
  }

  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== "admin") {
    throw new HttpsError("permission-denied",
      "Only admin users can delete accounts");
  }

  const {userId} = request.data || {};
  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument",
      "userId is required and must be a string");
  }

  try {
    const msg = `Admin ${callerUid} attempting to delete user ${userId}`;
    logger.info(msg);

    // Prevent accidental deletion of admin accounts or self-deletion
    try {
      const targetDoc = await admin.firestore().collection('users').doc(userId).get();
      if (targetDoc.exists) {
        const targetData = targetDoc.data();
        if (targetData && targetData.role === 'admin') {
          logger.warn(`Attempt to delete admin account blocked for user ${userId}`);
          throw new HttpsError('permission-denied', 'Cannot delete an admin account');
        }
      }
      // Disallow self-deletion via this callable (require a safer workflow)
      if (userId === callerUid) {
        logger.warn(`Attempt to self-delete blocked for admin ${callerUid}`);
        throw new HttpsError('permission-denied', 'Admins cannot delete their own account via this function');
      }
    } catch (precheckError) {
      // If the check threw an HttpsError, rethrow so it propagates to the client
      if (precheckError instanceof HttpsError) throw precheckError;
      // Otherwise, log and continue - the subsequent deletion attempt will surface any issues
      logger.warn('Error performing pre-delete checks:', precheckError);
    }
    // Delete from Firebase Authentication
    try {
      await admin.auth().deleteUser(userId);
      logger.info(`Successfully deleted Firebase Auth for user ${userId}`);
    } catch (authError: unknown) {
      const error = authError as {code?: string; message?: string};
      // If user doesn't exist in Auth, that's okay
      if (error.code !== "auth/user-not-found") {
        const errMsg = `Error deleting Firebase Auth for user ${userId}:`;
        logger.error(errMsg, authError);
        const failMsg = `Failed to delete auth: ${error.message}`;
        throw new HttpsError("internal", failMsg);
      }
      logger.info(`User ${userId} not found in Auth, continuing cleanup`);
    }

    // Delete from Firestore users collection
    await admin.firestore().collection("users").doc(userId).delete();
    logger.info(`Successfully deleted Firestore doc for ${userId}`);

    // Delete any pending signup requests for this user.
    // Handle both current ('uid') and legacy ('userId') field names to be robust
    // against older documents that may have used a different schema.
    const signupRequestsRef = admin.firestore().collection('signupRequests');

    const [qUid, qUserId] = await Promise.all([
      signupRequestsRef.where('uid', '==', userId).get(),
      signupRequestsRef.where('userId', '==', userId).get(),
    ]);

    // Merge unique documents (dedupe by document path/id)
    const docsMap = new Map<string, QueryDocumentSnapshot>();
    qUid.docs.forEach((d: QueryDocumentSnapshot) => docsMap.set(d.ref.path, d));
    qUserId.docs.forEach((d: QueryDocumentSnapshot) => docsMap.set(d.ref.path, d));

    const batch = admin.firestore().batch();
    docsMap.forEach((docSnap) => batch.delete(docSnap.ref));

    const deletedCount = docsMap.size;
    if (deletedCount > 0) {
      await batch.commit();
      logger.info(`Deleted ${deletedCount} signup request(s) for user ${userId}`);
    }

    return {
      success: true,
      message: `User account ${userId} has been completely deleted`,
      deletedAuthAccount: true,
      deletedFirestoreDoc: true,
      deletedSignupRequests: deletedCount,
    };
  } catch (error: unknown) {
    const err = error as {message?: string};
    logger.error(`Error in deleteUserAccount for user ${userId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    const failMsg = `Failed to delete user account: ${err.message}`;
    throw new HttpsError("internal", failMsg);
  }
});

/**
 * Callable: cancelBookingRequest
 * Allows the owner (faculty) of a booking request to cancel/delete it within a short undo window.
 * Validates caller is authenticated and owns the request. The request must be in 'pending' state and
 * must have been created within the last UNDO_WINDOW_MS milliseconds.
 */
export const cancelBookingRequest = onCall(async (request: CallableRequest<{ bookingRequestId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const bookingRequestId = request.data?.bookingRequestId;
  if (!bookingRequestId || typeof bookingRequestId !== 'string') {
    throw new HttpsError('invalid-argument', 'bookingRequestId is required and must be a string');
  }

  const UNDO_WINDOW_MS = 5 * 1000; // 5 seconds undo window

  try {
    const docRef = admin.firestore().collection('bookingRequests').doc(bookingRequestId);
    const snap = await docRef.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Booking request not found');
    }

    const data = snap.data() as Record<string, any> | undefined;
    if (!data) {
      throw new HttpsError('not-found', 'Booking request data missing');
    }

    // Only the owner can cancel
    if (data.facultyId !== callerUid) {
      logger.warn(`User ${callerUid} attempted to cancel booking ${bookingRequestId} owned by ${data.facultyId}`);
      throw new HttpsError('permission-denied', 'Only the booking owner may cancel this request');
    }

    // Only allow cancel for pending requests
    if (data.status && data.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Cannot cancel a booking that has already been processed');
    }

    // Determine created timestamp. Support several possible shapes: Firestore Timestamp, ISO string, numeric millis
    let createdAtMs: number | null = null;
    const createdAt = data.createdAt ?? data.requestDate ?? null;
    if (createdAt) {
      // Firestore Timestamp-like
      if (typeof createdAt === 'object' && typeof (createdAt as any).toMillis === 'function') {
        createdAtMs = (createdAt as any).toMillis();
      } else if (typeof createdAt === 'number') {
        // assume milliseconds
        createdAtMs = createdAt;
      } else if (typeof createdAt === 'string') {
        const p = Date.parse(createdAt);
        if (!isNaN(p)) createdAtMs = p;
      }
    }

    if (!createdAtMs) {
      // If we can't determine creation time conservatively deny cancellation
      throw new HttpsError('failed-precondition', 'Cannot determine creation time for this booking; undo not allowed');
    }

    const ageMs = Date.now() - createdAtMs;
    if (ageMs > UNDO_WINDOW_MS) {
      throw new HttpsError('failed-precondition', 'Undo window expired');
    }

    // Passed checks: delete the document
    await docRef.delete();
    logger.info(`Booking request ${bookingRequestId} cancelled by owner ${callerUid}`);

    return { success: true, message: 'Booking request cancelled' };
  } catch (err: unknown) {
    logger.error('cancelBookingRequest error:', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Failed to cancel booking request');
  }
});

/**
 * Deletes a classroom and cascades deletion to related bookingRequests and schedules
 * Only non-lapsed bookings/schedules are deleted. Lapsed entries are preserved.
 * This function must be called by an authenticated admin user.
 */
export const deleteClassroomCascade = onCall(async (request: CallableRequest<{ classroomId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admin users can delete classrooms');
  }

  const { classroomId } = request.data || {};
  if (!classroomId || typeof classroomId !== 'string') {
    throw new HttpsError('invalid-argument', 'classroomId is required and must be a string');
  }

  logger.info(`Admin ${callerUid} requested cascade delete for classroom ${classroomId}`);

  // Helper: parse date + time into JS Date. Supports 'HH:MM' (24h) and 'h:mm AM/PM'.
  const parseBookingDateTime = (dateStr: string, timeStr: string): Date | null => {
    try {
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      if (!y || !m || !d) return null;
      let hours = 0;
      let minutes = 0;

      const trimmed = (timeStr || '').trim();
      if (!trimmed) return null;

      const ampmMatch = trimmed.match(/(AM|PM)$/i);
      if (ampmMatch) {
        // 12-hour format
        const parts = trimmed.replace(/\s?(AM|PM)$/i, '').split(':');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
        const isPM = /PM$/i.test(trimmed);
        if (hours === 12) {
          hours = isPM ? 12 : 0;
        } else if (isPM) {
          hours += 12;
        }
      } else {
        // assume 24-hour HH:MM
        const parts = trimmed.split(':');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
      }

      return new Date(y, m - 1, d, hours, minutes, 0, 0);
    } catch (e) {
      return null;
    }
  };

  // Consider lapsed if endDateTime <= now + buffer
  const isLapsed = (dateStr: string, endTimeStr: string): boolean => {
    const dt = parseBookingDateTime(dateStr, endTimeStr);
    if (!dt) return false; // if cannot parse, be conservative (do NOT delete)
    const now = new Date();
    // small buffer 5 minutes
    const bufferMs = 5 * 60 * 1000;
    return dt.getTime() <= now.getTime() + bufferMs;
  };

  try {
    const db = admin.firestore();

    // Verify classroom exists
    const classroomDoc = await db.collection('classrooms').doc(classroomId).get();
    if (!classroomDoc.exists) {
      throw new HttpsError('not-found', 'Classroom not found');
    }

    // Ensure idempotency: create a lock document so concurrent calls don't perform duplicate work.
    const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    const lockRef = db.collection('deletionLocks').doc(classroomId);

    // Acquire lock in a transaction: fail if a recent lock exists
  await db.runTransaction(async (tx: Transaction) => {
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists) {
        const ld = lockSnap.data() as DeletionLockDoc | undefined;
        const lockedAt = typeof ld?.timestamp === 'number' ? ld.timestamp : 0;
        if (Date.now() - lockedAt < LOCK_TIMEOUT_MS) {
          throw new HttpsError('already-exists', 'A deletion for this classroom is already in progress');
        }
      }
      tx.set(lockRef, { locked: true, lockedBy: callerUid, timestamp: Date.now() });
    });

    // Query related bookingRequests and schedules
    const bookingSnap = await db.collection('bookingRequests').where('classroomId', '==', classroomId).get();
    const scheduleSnap = await db.collection('schedules').where('classroomId', '==', classroomId).get();

    const toDeleteRefs: admin.firestore.DocumentReference[] = [];

  bookingSnap.docs.forEach((d: QueryDocumentSnapshot) => {
      const data = d.data() as BookingDocData | undefined;
      const lapsed = !data ? false : isLapsed(data.date || '', data.endTime || '');
      if (!lapsed) toDeleteRefs.push(d.ref);
    });

  scheduleSnap.docs.forEach((d: QueryDocumentSnapshot) => {
      const data = d.data() as BookingDocData | undefined;
      const lapsed = !data ? false : isLapsed(data.date || '', data.endTime || '');
      if (!lapsed) toDeleteRefs.push(d.ref);
    });

    // Batch delete in chunks of 450
    const CHUNK = 450;
    let deletedCount = 0;
    for (let i = 0; i < toDeleteRefs.length; i += CHUNK) {
      const chunk = toDeleteRefs.slice(i, i + CHUNK);
      const batch = db.batch();
      chunk.forEach((ref) => batch.delete(ref));
      await batch.commit();
      deletedCount += chunk.length;
    }

    // Finally delete the classroom document
    await db.collection('classrooms').doc(classroomId).delete();
    logger.info(`Cascade delete complete for classroom ${classroomId}. Deleted ${deletedCount} related docs.`);

    // Write an audit log entry
    const auditEntry = {
      classroomId,
      deletedBy: callerUid,
      deletedCount,
      timestamp: Date.now(),
    };
    await db.collection('deletionLogs').add(auditEntry);

    // Create a simple notification document for further processing (emails, etc.)
    await db.collection('deletionNotifications').add({
      title: `Classroom ${classroomId} deleted`,
      message: `Admin ${callerUid} deleted classroom ${classroomId} and ${deletedCount} related item(s).`,
      classroomId,
      deletedBy: callerUid,
      deletedCount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });

    // Release the lock
    try {
      await lockRef.delete();
    } catch (e) {
      logger.warn('Failed to delete deletion lock:', e);
    }

    return { success: true, deletedRelated: deletedCount };
  } catch (error) {
    logger.error(`Error in deleteClassroomCascade for ${classroomId}:`, error);
    // Attempt to clean up the lock if present
    try {
      const db = admin.firestore();
      const lockRef = db.collection('deletionLocks').doc(classroomId);
      const lockSnap = await lockRef.get();
      if (lockSnap.exists) {
        await lockRef.delete();
      }
    } catch (cleanupErr) {
      logger.warn('Failed to cleanup deletion lock after error:', cleanupErr);
    }

    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to delete classroom: ${error instanceof Error ? error.message : String(error)}`);
  }
});

/**
 * Callable: cancel an approved booking as admin.
 * Expects data: { scheduleId: string, adminFeedback: string }
 * Only callable by users with role === 'admin' in `users` collection.
 */
export const cancelApprovedBooking = onCall(async (request: CallableRequest<{ scheduleId?: string; adminFeedback?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }
  const callerData = callerDoc.data();
  // Allow either an admin or the owner (faculty) of the reservation to cancel it.
  const callerRole = callerData?.role;

  const { scheduleId, adminFeedback } = request.data || {};
  if (!scheduleId || typeof scheduleId !== 'string') {
    throw new HttpsError('invalid-argument', 'scheduleId is required and must be a string');
  }
  const feedback = typeof adminFeedback === 'string' ? adminFeedback.trim() : '';
  if (!feedback) {
    throw new HttpsError('invalid-argument', 'adminFeedback (cancellation reason) is required');
  }

  try {
    const ref = admin.firestore().collection('schedules').doc(scheduleId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Schedule not found');
    }

    const data = snap.data() as any;

    // Check if schedule has already started/past. Try to use explicit timestamp `startAt` if available,
    // else fall back to date + startTime parsing conservatively.
    const now = admin.firestore.Timestamp.now();
    const parseStart = (): admin.firestore.Timestamp | null => {
      if (data?.startAt && data.startAt._seconds) return data.startAt as admin.firestore.Timestamp;
      if (data?.startAt && data.startAt.seconds) return admin.firestore.Timestamp.fromMillis((data.startAt.seconds || 0) * 1000);
      if (data?.date && data?.startTime) {
        try {
          const iso = `${data.date}T${data.startTime}`;
          const dt = new Date(iso);
          if (!isNaN(dt.getTime())) return admin.firestore.Timestamp.fromDate(dt);
        } catch (e) {
          // ignore
        }
      }
      return null;
    };

    const startTs = parseStart();
    if (startTs && startTs.toMillis() <= now.toMillis()) {
      throw new HttpsError('failed-precondition', 'Cannot cancel a booking that has already started or passed');
    }

    // Determine if caller is admin or the owner (facultyId must match callerUid)
    const isOwner = !!data && data.facultyId === callerUid;
    const isAdmin = callerRole === 'admin';
    if (!isAdmin && !isOwner) {
      throw new HttpsError('permission-denied', 'Only admins or the reservation owner can cancel this booking');
    }

    // Perform the cancellation update
    await ref.update({
      status: 'cancelled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      adminFeedback: feedback,
    });

    // Also update corresponding bookingRequests (best-effort: find by matching fields)
    try {
      const reqs = await admin.firestore().collection('bookingRequests')
        .where('facultyId', '==', data.facultyId)
        .where('date', '==', data.date)
        .where('startTime', '==', data.startTime)
        .where('endTime', '==', data.endTime)
        .where('classroomId', '==', data.classroomId)
        .get();

      const batch = admin.firestore().batch();
      reqs.docs.forEach(d => {
        // Mark updatedBy so server-side triggers can avoid notifying the actor who initiated the cancellation
        batch.update(d.ref, { status: 'cancelled', adminFeedback: feedback, updatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedBy: callerUid });
      });
      if (!reqs.empty) await batch.commit();
    } catch (err) {
      logger.warn('Failed to update related bookingRequests during cancelApprovedBooking', err);
    }

    // Create notifications based on who performed the cancellation
    try {
      if (data && data.facultyId) {
        if (callerUid && callerUid === data.facultyId) {
          // Faculty cancelled their own booking - notify all admins
          logger.info(`Faculty member ${data.facultyId} cancelled their own reservation - notifying admins`);
          
          const facultyName = (callerData && (callerData.name || callerData.displayName)) ? (callerData.name || callerData.displayName) : 'A faculty member';
          const message = `${facultyName} cancelled their approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime}. Reason: ${feedback}`;

          // Get all admin users to notify them
          try {
            const adminsSnap = await admin.firestore().collection('users').where('role', '==', 'admin').get();
            await Promise.all(
              adminsSnap.docs.map((adminDoc) => 
                persistAndSendNotification(adminDoc.id, 'faculty_cancelled', message, { 
                  bookingRequestId: null, 
                  adminFeedback: feedback, 
                  actorId: callerUid 
                })
              )
            );
            logger.info(`Notified ${adminsSnap.size} admin(s) about faculty cancellation`);
          } catch (adminNotifErr) {
            logger.warn('Failed to notify admins about faculty cancellation', adminNotifErr);
          }
        } else {
          // Admin cancelled the booking - notify the faculty member
          const adminName = (callerData && (callerData.name || callerData.displayName)) ? (callerData.name || callerData.displayName) : 'an administrator';
          const message = `Admin ${adminName} cancelled your approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime}.`;

          // Use shared helper to persist notification and attempt FCM send. Pass actorId
          try {
            await persistAndSendNotification(data.facultyId, 'cancelled', message, { bookingRequestId: null, adminFeedback: feedback, actorId: callerUid });
          } catch (helperErr) {
            logger.warn('Failed to create/send faculty notification via helper in cancelApprovedBooking', helperErr);
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to create notification in cancelApprovedBooking', err);
    }

    return { success: true };
  } catch (error: unknown) {
    logger.error('Error in cancelApprovedBooking callable:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to cancel approved booking');
  }
});

/**
 * Tracks failed login attempts and locks accounts after too many failures
 * Called by the client after a failed login attempt
 */
/**
 * Tracks failed login attempts for brute force protection.
 * Called after each failed authentication attempt.
 * Increments attempt counter and locks account after threshold is exceeded.
 */
/**
 * Verify reCAPTCHA token before login attempt
 * This function MUST be called before trackFailedLogin to prevent brute force attacks
 * Now includes password leak detection via reCAPTCHA Enterprise
 * CORS enabled for localhost:3000 and production domains
 */
export const verifyLoginRecaptcha = onCall(
  {
    cors: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://plv-classroom-assigment.web.app',
      'https://plv-classroom-assigment.firebaseapp.com',
      'https://digital-classroom-reservation-for-plv.vercel.app',
      /\.vercel\.app$/
    ]
  },
  async (request: CallableRequest<{ email?: string; recaptchaToken?: string; password?: string }>) => {
    const { email, recaptchaToken, password } = request.data || {};

    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "email is required and must be a string");
    }

    if (!recaptchaToken || typeof recaptchaToken !== "string") {
      throw new HttpsError("invalid-argument", "reCAPTCHA token is required");
    }

    try {
      // Import the verifyRecaptchaWithPassword helper from recaptcha.ts
      const { verifyRecaptchaWithPassword } = await import('./recaptcha');
      
      // Verify the reCAPTCHA token with action 'LOGIN' and optional password check
      const result = await verifyRecaptchaWithPassword(
        recaptchaToken,
        'LOGIN',
        password, // Optional password for leak detection
        0.5 // Score threshold
      );
      
      if (!result.verified) {
        logger.warn(`reCAPTCHA verification failed for login attempt: ${email}`, {
          reason: result.reason,
          score: result.score,
        });
        throw new HttpsError("permission-denied", "reCAPTCHA verification failed. Please try again.");
      }

      logger.info(`reCAPTCHA verification successful for login: ${email}`, {
        score: result.score,
        passwordChecked: !!password,
        isLeaked: result.isPasswordLeaked,
      });
      
      return {
        success: true,
        verified: true,
        score: result.score,
        isPasswordLeaked: result.isPasswordLeaked || false,
        leakReason: result.leakReason || [],
      };
    } catch (error: unknown) {
      const err = error as { message?: string };
      
      // If it's already an HttpsError, re-throw it
      if (error instanceof HttpsError) {
        throw error;
      }
      
      logger.error(`Error verifying reCAPTCHA for login ${email}:`, error);
      throw new HttpsError("internal", `reCAPTCHA verification error: ${err.message}`);
    }
  }
);

export const trackFailedLogin = onCall(async (request: CallableRequest<{ email?: string }>) => {
  const {email} = request.data || {};

  if (!email || typeof email !== "string") {
    throw new HttpsError("invalid-argument",
      "email is required and must be a string");
  }

  const emailLower = email.toLowerCase().trim();

  try {
    logger.info(`Tracking failed login attempt for: ${emailLower}`);

    // Find user by email
    const usersRef = admin.firestore().collection("users");
    const querySnapshot = await usersRef
      .where("emailLower", "==", emailLower)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      // User doesn't exist - don't reveal this info
      logger.info(`No user found for email: ${emailLower}`);
      return {
        success: true,
        locked: false,
        attemptsRemaining: MAX_FAILED_ATTEMPTS,
      };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const currentAttempts = (userData.failedLoginAttempts || 0) + 1;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
        .toISOString();

      await userDoc.ref.update({
        failedLoginAttempts: currentAttempts,
        accountLocked: true,
        lockedUntil: lockedUntil,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.warn(`Account locked for ${emailLower} after ${currentAttempts} attempts`);

      return {
        success: true,
        locked: true,
        attemptsRemaining: 0,
        lockedUntil: lockedUntil,
        message: `Account locked for 30 minutes due to too many failed attempts`,
      };
    } else {
      // Just increment the counter
      await userDoc.ref.update({
        failedLoginAttempts: currentAttempts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const attemptsRemaining = MAX_FAILED_ATTEMPTS - currentAttempts;
      logger.info(`Failed attempt ${currentAttempts}/${MAX_FAILED_ATTEMPTS} for ${emailLower}`);

      return {
        success: true,
        locked: false,
        attemptsRemaining: attemptsRemaining,
        message: attemptsRemaining <= 2 ?
          `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? "s" : ""} remaining before account lockout` :
          undefined,
      };
    }
  } catch (error: unknown) {
    const err = error as {message?: string};
    logger.error(`Error tracking failed login for ${emailLower}:`, error);
    throw new HttpsError("internal",
      `Failed to track login attempt: ${err.message}`);
  }
});

/**
 * Callable: revoke refresh tokens for a user (forces sign-out on other sessions).
 * Only callable by admin users.
 * Note: revoking refresh tokens prevents new ID tokens from being minted from existing refresh tokens.
 * Existing ID tokens remain valid until they expire (typically up to 1 hour).
 */
export const revokeUserTokens = onCall(async (request: CallableRequest<{ userId?: string; reason?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admin users may revoke tokens');
  }

  const { userId, reason } = request.data || {};
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId is required and must be a string');
  }

  try {
    logger.info(`Admin ${callerUid} requested token revocation for user ${userId}`);

    // Revoke refresh tokens for the target user
    await admin.auth().revokeRefreshTokens(userId);

    // Optionally write an audit record for transparency
    try {
      await admin.firestore().collection('tokenRevocations').add({
        userId,
        revokedBy: callerUid,
        reason: reason || null,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (auditErr) {
      logger.warn('Failed to write token revocation audit record:', auditErr);
    }

    return {
      success: true,
      message: 'Revoked refresh tokens. Existing ID tokens will expire naturally; users may be signed out within an hour.',
    };
  } catch (err) {
    logger.error('Error revoking tokens for user', userId, err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', `Failed to revoke tokens for user ${userId}`);
  }
});

/**
 * Acknowledge multiple notifications in a single callable.
 * Expects request.data.notificationIds: string[]
 * Returns { success: true, unreadCount: number }
 */
export const acknowledgeNotifications = onCall(async (request: CallableRequest<{ notificationIds?: string[] }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const ids = Array.isArray(request.data?.notificationIds) ? request.data!.notificationIds! : [];
  if (!ids.length) {
    throw new HttpsError('invalid-argument', 'notificationIds is required and must be a non-empty array');
  }

  try {
    const db = admin.firestore();
    const batch = db.batch();

    // Update each notification doc to mark acknowledgedAt and acknowledgedBy
    ids.forEach((id) => {
      const ref = db.collection('notifications').doc(id);
      batch.update(ref, {
        acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
        acknowledgedBy: callerUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    // Compute new unread count for the calling user
    const unreadSnap = await db.collection('notifications')
      .where('userId', '==', callerUid)
      .where('acknowledgedAt', '==', null)
      .get();

    const unreadCount = unreadSnap.size;

    return { success: true, unreadCount };
  } catch (err) {
    logger.error('Error in acknowledgeNotifications:', err);
    throw new HttpsError('internal', 'Failed to acknowledge notifications');
  }
});

/**
 * Callable function to create a notification server-side.
 * Only callable by admin users.
 * Expects data: { userId: string, type: 'approved'|'rejected'|'info'|'cancelled', message: string, bookingRequestId?: string, adminFeedback?: string, actorId?: string }
 */
export const createNotification = onCall(async (request: CallableRequest<{ userId?: string; type?: string; message?: string; bookingRequestId?: string; adminFeedback?: string; actorId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }
  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admin users may create notifications');
  }

  const data = request.data || {};
  const { userId, type, message, bookingRequestId, adminFeedback, actorId } = data;
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId is required and must be a string');
  }
  if (!type || (type !== 'approved' && type !== 'rejected' && type !== 'info' && type !== 'cancelled' && type !== 'signup' && type !== 'classroom_disabled')) {
    throw new HttpsError('invalid-argument', "type must be 'approved', 'rejected', 'info', 'cancelled', 'signup' or 'classroom_disabled'");
  }
  if (!message || typeof message !== 'string') {
    throw new HttpsError('invalid-argument', 'message is required and must be a string');
  }

  // Defensive handling of adminFeedback: trim and truncate to 500 chars.
  const MAX_ADMIN_FEEDBACK = 500;
  let storedAdminFeedback: string | null = null;
  let finalMessage = message;
  if (adminFeedback && typeof adminFeedback === 'string') {
    const trimmed = adminFeedback.trim();
    if (trimmed.length > 0) {
      storedAdminFeedback = trimmed.length > MAX_ADMIN_FEEDBACK ? trimmed.substring(0, MAX_ADMIN_FEEDBACK) : trimmed;
      // Create a shorter excerpt for the message preview to avoid huge notifications in UIs
      const EXCERPT_LEN = 240;
      const excerpt = storedAdminFeedback.length > EXCERPT_LEN ? storedAdminFeedback.substring(0, EXCERPT_LEN) + '…' : storedAdminFeedback;
      finalMessage = `${message}\n\nAdmin reason: ${excerpt}`;
    }
  }

  // Delegate persistence + FCM send to helper to avoid duplication across functions
  try {
    const result = await persistAndSendNotification(userId, type as string, finalMessage, {
      bookingRequestId: bookingRequestId || null,
      adminFeedback: storedAdminFeedback,
      actorId: actorId || null,
    });

    if (result && result.skipped) return { success: true, id: null, skipped: true };
    return { success: true, id: result.id };
  } catch (err) {
    logger.error('Failed to create notification via helper', err);
    throw new HttpsError('internal', 'Failed to create notification');
  }
});

/**
 * Helper: persist a notification document and attempt FCM send.
 * Returns { id } on success or { skipped: true } if actor === recipient.
 */
async function persistAndSendNotification(
  userId: string,
  type: string,
  finalMessage: string,
  options?: { bookingRequestId?: string | null; adminFeedback?: string | null; actorId?: string | null }
) {
  const actorId = options?.actorId || null;
  if (actorId && actorId === userId) {
    logger.info(`persistAndSendNotification: skipping notification and FCM because actorId === recipient (${actorId})`);
    return { skipped: true, id: null } as any;
  }

  const db = admin.firestore();
  const record: any = {
    userId,
    type,
    message: finalMessage,
    bookingRequestId: options?.bookingRequestId || null,
    adminFeedback: options?.adminFeedback || null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Server-side dedupe: avoid creating duplicate notifications for the same
  // recipient, type and bookingRequestId within a short time window. This is
  // a best-effort guard against accidental double-creation from different
  // code paths (client + server) or retried operations.
  try {
    const recentSnap = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const nowMs = Date.now();
    const WINDOW_MS = 2 * 60 * 1000; // 2 minutes

    for (const doc of recentSnap.docs) {
      const d = doc.data() as any;
      // Normalize bookingRequestId values for comparison (null vs undefined)
      const existingBR = typeof d.bookingRequestId === 'undefined' ? null : d.bookingRequestId;
      const newBR = typeof options?.bookingRequestId === 'undefined' ? null : options?.bookingRequestId;

      // createdAt may be a Firestore Timestamp; convert to millis safely
      const createdAtTs = d.createdAt && typeof d.createdAt.toMillis === 'function' ? d.createdAt.toMillis() : 0;

      if (
        existingBR === newBR &&
        (!d.acknowledgedAt) &&
        createdAtTs > 0 &&
        (nowMs - createdAtTs) <= WINDOW_MS
      ) {
        logger.info(`persistAndSendNotification: skipping duplicate notification for user=${userId} type=${type} bookingRequestId=${newBR}`);
        return { skipped: true, id: null } as any;
      }
    }
  } catch (dedupeErr) {
    // If dedupe check fails for any reason, proceed to create the notification
    logger.warn('persistAndSendNotification: dedupe check failed, continuing to create notification', dedupeErr);
  }

  const ref = await db.collection('notifications').add(record);

  try {
    // Check if user has push notifications enabled before attempting to send
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() as any;
    const pushEnabled = userData && userData.pushEnabled === true;

    if (!pushEnabled) {
      logger.info(`persistAndSendNotification: skipping FCM send for user ${userId} - push notifications disabled`);
      return { success: true, id: ref.id } as any;
    }

    const tokensSnap = await db.collection('pushTokens').where('userId', '==', userId).get();
    if (!tokensSnap.empty) {
      const tokens: string[] = [];
      tokensSnap.docs.forEach(d => {
        const data = d.data() as any;
        if (data && data.token) tokens.push(data.token as string);
      });

      if (tokens.length > 0) {
        const notificationPayload = {
          notification: {
            title: 'PLV CEIT Notification',
            body: finalMessage.substring(0, 200),
          },
          data: {
            notificationId: ref.id,
            message: finalMessage,
            type: String(type),
          }
        } as any;

        if (tokens.length === 1) {
          const singleMsg: admin.messaging.Message = { ...notificationPayload, token: tokens[0] } as unknown as admin.messaging.Message;
          await admin.messaging().send(singleMsg);
        } else {
          // Robust runtime handling for different firebase-admin versions:
          // Try sendMulticast, then sendAll, then fall back to sendToDevice (older API).
          // If none of those exist, fall back to chunked individual sends using admin.messaging().send()
          const messagingAny = (admin.messaging() as any);
          try {
            if (typeof messagingAny.sendMulticast === 'function') {
              const multiMsg = { tokens, ...notificationPayload } as any;
              await messagingAny.sendMulticast(multiMsg);
            } else if (typeof messagingAny.sendAll === 'function') {
              const messages: any[] = tokens.map((t: string) => ({ token: t, ...notificationPayload }));
              await messagingAny.sendAll(messages);
            } else if (typeof messagingAny.sendToDevice === 'function') {
              // sendToDevice accepts (registrationTokens, payload[, options]) and exists on older SDKs
              await messagingAny.sendToDevice(tokens, notificationPayload);
            } else {
              // Fallback: send individual messages in controllable chunks to avoid overloading the runtime
              logger.warn('No compatible FCM multicast/sendAll/sendToDevice method available on admin.messaging(); falling back to chunked individual sends.');
              const CHUNK_SIZE = 100;
              for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
                const chunk = tokens.slice(i, i + CHUNK_SIZE);
                const promises = chunk.map((t: string) => {
                  const msg = { token: t, ...notificationPayload } as any;
                  return admin.messaging().send(msg).then((r) => ({ ok: true, res: r })).catch((e) => ({ ok: false, err: e }));
                });
                const results = await Promise.all(promises);
                const failures = results.filter(r => !r.ok) as any[];
                if (failures.length > 0) {
                  logger.warn(`FCM chunk starting at ${i} had ${failures.length} failures`, failures.map(f => f.err));
                }
              }
            }
          } catch (sendErr) {
            logger.error('FCM multicast/send fallback failed:', sendErr);
          }
        }
      }
    }
  } catch (fcmErr) {
    logger.error('Failed to send FCM message in helper:', fcmErr);
  }

  return { success: true, id: ref.id } as any;
}

/**
 * Callable to register a push token for the current authenticated user.
 * Expects data: { token: string }
 */
export const registerPushToken = onCall(async (request: CallableRequest<{ token?: string }>) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const userId = request.auth.uid;
  const token = request.data?.token;
  if (!token || typeof token !== 'string') throw new HttpsError('invalid-argument', 'token is required');

  try {
    logger.info(`registerPushToken called by ${userId}`);
    const snap = await admin.firestore().collection('pushTokens').where('token', '==', token).get();
    if (!snap.empty) {
      // Update ownership
      const docRef = snap.docs[0].ref;
      await docRef.update({ userId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { success: true };
    }

    await admin.firestore().collection('pushTokens').add({ userId, token, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true };
  } catch (err) {
    logger.error('Failed to register push token', err);
    throw new HttpsError('internal', 'Failed to register push token');
  }
});

/**
 * Callable to unregister a push token.
 * Expects data: { token: string }
 */
export const unregisterPushToken = onCall(async (request: CallableRequest<{ token?: string }>) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const userId = request.auth.uid;
  const token = request.data?.token;
  if (!token || typeof token !== 'string') throw new HttpsError('invalid-argument', 'token is required');

  try {
    logger.info(`unregisterPushToken called by ${userId}`);
    const snap = await admin.firestore().collection('pushTokens').where('token', '==', token).get();
    if (snap.empty) return { success: true };
    const batch = admin.firestore().batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { success: true };
  } catch (err) {
    logger.error('Failed to unregister push token', err);
    throw new HttpsError('internal', 'Failed to unregister push token');
  }
});

/**
 * Callable to set the pushEnabled flag on the authenticated user's Firestore profile.
 * Expects data: { enabled: boolean }
 * This avoids allowing client SDKs to write pushEnabled directly when rules are restrictive.
 */
export const setPushEnabled = onCall(async (request: CallableRequest<{ enabled?: boolean }>) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const userId = request.auth.uid;
  const enabled = request.data?.enabled;
  if (typeof enabled !== 'boolean') throw new HttpsError('invalid-argument', 'enabled (boolean) is required');

  try {
    logger.info(`setPushEnabled called by ${userId}: ${enabled}`);
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.update({ pushEnabled: enabled, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, enabled };
  } catch (err) {
    logger.error('Failed to set pushEnabled', err);
    throw new HttpsError('internal', 'Failed to update push preference');
  }
});

/**
 * Callable to notify all admins about a new booking request.
 * Expects data: { bookingRequestId: string, facultyId: string, facultyName: string, classroomName: string, date: string, startTime: string, endTime: string, purpose?: string }
 * Callable by any authenticated user (the faculty who created the request will normally call this via the client service).
 */
export const notifyAdminsOfNewRequest = onCall(async (request: CallableRequest<{ bookingRequestId?: string; facultyId?: string; facultyName?: string; classroomName?: string; date?: string; startTime?: string; endTime?: string; purpose?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  const data = request.data || {};
  const { bookingRequestId, facultyId, facultyName, classroomName, date, startTime, endTime, purpose } = data;
  if (!bookingRequestId || typeof bookingRequestId !== 'string') {
    throw new HttpsError('invalid-argument', 'bookingRequestId is required and must be a string');
  }
  if (!facultyId || !facultyName || !classroomName || !date || !startTime || !endTime) {
    throw new HttpsError('invalid-argument', 'Missing required booking request metadata');
  }

  try {
    const db = admin.firestore();
    // Find all admin users
    const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (adminsSnap.empty) return { success: true, notified: 0 };

    const shortMessage = `New reservation request from ${facultyName}: ${classroomName} on ${date} ${startTime}-${endTime}.`;
    const longMessage = purpose ? `${shortMessage} Purpose: ${purpose}` : shortMessage;

    // Persist + send notifications to each admin via shared helper. Pass actorId so actor-exclusion applies.
    const actorId = request.auth?.uid || null;
    const results = await Promise.allSettled(
      adminsSnap.docs.map((adoc) => persistAndSendNotification(adoc.id, 'info', longMessage, { bookingRequestId, adminFeedback: null, actorId }))
    );

    const notified = results.reduce((count, r) => (r.status === 'fulfilled' && !(r.value && (r.value as any).skipped) ? count + 1 : count), 0);
    return { success: true, notified };
  } catch (err) {
    logger.error('Failed to notify admins of new booking request', err);
    throw new HttpsError('internal', 'Failed to notify admins');
  }
});

/**
 * Callable to notify admins about a new signup request
 * Expects data: { requestId: string; name: string; email: string }
 */
export const notifyAdminsOfNewSignup = onCall(async (request: CallableRequest<{ requestId?: string; name?: string; email?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  const { requestId, name, email } = request.data || {};
  if (!requestId || !name || !email) {
    throw new HttpsError('invalid-argument', 'requestId, name and email are required');
  }

  try {
    const db = admin.firestore();
    const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (adminsSnap.empty) return { success: true, notified: 0 };

    const msg = `New signup request from ${name} (${email}).`;
    const actorId = request.auth?.uid || null;
    const results = await Promise.allSettled(
      adminsSnap.docs.map((adoc) => persistAndSendNotification(adoc.id, 'signup', msg, { bookingRequestId: null, adminFeedback: null, actorId }))
    );
    const notified = results.reduce((count, r) => (r.status === 'fulfilled' && !(r.value && (r.value as any).skipped) ? count + 1 : count), 0);
    return { success: true, notified };
  } catch (err) {
    logger.error('Failed to notify admins of new signup', err);
    throw new HttpsError('internal', 'Failed to notify admins of new signup');
  }
});

/**
 * Callable to send a one-off test push to a token that belongs to the caller.
 * Expects data: { token: string, title?: string, body?: string }
 * Only allowed to send to tokens recorded for the calling user.
 */
export const sendTestPush = onCall(async (request: CallableRequest<{ token?: string; title?: string; body?: string }>) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Must be authenticated');
  const callerUid = request.auth.uid;
  const token = request.data?.token;
  const title = request.data?.title || 'Test Notification';
  const body = request.data?.body || 'This is a test push sent from Cloud Functions.';

  if (!token || typeof token !== 'string') throw new HttpsError('invalid-argument', 'token is required');

  try {
    // Diagnostic logs: report the installed firebase-admin version and which messaging methods exist.
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const adminPkg = require('firebase-admin/package.json');
      logger.info('firebase-admin package version (runtime):', adminPkg && adminPkg.version ? adminPkg.version : 'unknown');
    } catch (e) {
      logger.warn('Could not read firebase-admin/package.json at runtime:', e);
    }
    try {
      const messagingAny = (admin.messaging() as any);
      logger.info('messaging.sendMulticast type:', typeof messagingAny.sendMulticast);
      logger.info('messaging.sendAll type:', typeof messagingAny.sendAll);
      logger.info('messaging.sendToDevice type:', typeof messagingAny.sendToDevice);
    } catch (e) {
      logger.warn('Could not inspect admin.messaging() methods:', e);
    }

    const snap = await admin.firestore().collection('pushTokens').where('token', '==', token).get();
    if (snap.empty) {
      throw new HttpsError('permission-denied', 'Token not found');
    }
    // Ensure the token belongs to the caller
    const owned = snap.docs.some(d => (d.data() as any).userId === callerUid);
    if (!owned) {
      throw new HttpsError('permission-denied', 'Token does not belong to caller');
    }

    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: { test: 'true' }
    } as any;

    const res = await admin.messaging().send(message);
    return { success: true, result: res } as any;
  } catch (err) {
    logger.error('Failed to send test push', err);
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', 'Failed to send test push');
  }
});

/**
 * Callable function to acknowledge a notification.
 * Ensures server-side timestamping and verifies the caller is the recipient.
 * Expects data: { notificationId: string }
 */
export const acknowledgeNotification = onCall(async (request: CallableRequest<{ notificationId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  const callerUid = request.auth.uid;
  const data = request.data || {};
  const { notificationId } = data;

  if (!notificationId || typeof notificationId !== 'string') {
    throw new HttpsError('invalid-argument', 'notificationId is required and must be a string');
  }

  const notifRef = admin.firestore().collection('notifications').doc(notificationId);
  const notifSnap = await notifRef.get();
  if (!notifSnap.exists) {
    throw new HttpsError('not-found', 'Notification not found');
  }

  const notif = notifSnap.data() || {};
  if (notif.userId !== callerUid) {
    throw new HttpsError('permission-denied', 'Only the notification recipient may acknowledge this notification');
  }

  try {
    await notifRef.update({
      acknowledgedBy: callerUid,
      acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err: unknown) {
    logger.error('Failed to acknowledge notification', err);
    throw new HttpsError('internal', 'Failed to acknowledge notification');
  }
});

/**
 * Firestore trigger: when a bookingRequest document is updated, notify all admins
 * if the change was performed by a faculty user (i.e. the document has a facultyId)
 * and the change affects important fields (status, date, startTime, endTime, classroomId, purpose).
 * This guarantees admins are informed of faculty-initiated edits or cancellations.
 */
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';

export const bookingRequestOnUpdateNotifyAdmins = onDocumentUpdated('bookingRequests/{requestId}', async (event) => {
  try {
    if (!event.data) return { success: true, reason: 'no-data' };
    const beforeSnap = event.data.before;
    const afterSnap = event.data.after;
    if (!beforeSnap || !afterSnap) return { success: true, reason: 'no-snap' };

    const beforeData = beforeSnap.data() || {};
    const afterData = afterSnap.data() || {};

    // If there's no facultyId, don't create admin notifications
    const facultyId = afterData.facultyId || beforeData.facultyId;
    const facultyName = afterData.facultyName || beforeData.facultyName || 'A faculty member';
    if (!facultyId) return { success: true, reason: 'no-faculty' };

    // Determine whether a meaningful change occurred. Notify on:
    // - status changes (pending -> approved/rejected/cancelled/expired)
    // - changes to date/startTime/endTime/classroomId
    // - purpose/text edits (optional)
    const keysToCheck = ['status', 'date', 'startTime', 'endTime', 'classroomId', 'purpose'];
    let changedKeys: string[] = [];
    for (const k of keysToCheck) {
      const a = (afterData as any)[k];
      const b = (beforeData as any)[k];
      // treat undefined and null as equal; stringify for comparison to be safe
      if (JSON.stringify(a) !== JSON.stringify(b)) changedKeys.push(k);
    }

    if (changedKeys.length === 0) {
      return { success: true, reason: 'no-meaningful-change' };
    }

    // Build a human-friendly summary message for admins
    const classroomName = afterData.classroomName || beforeData.classroomName || 'a classroom';
    const date = afterData.date || beforeData.date || 'a date';
    const startTime = afterData.startTime || beforeData.startTime || '';
    const endTime = afterData.endTime || beforeData.endTime || '';

    const shortChangeSummary = changedKeys.map(k => {
      if (k === 'status') return `status -> ${afterData.status}`;
      if (k === 'purpose') return `purpose updated`;
      return `${k} changed`;
    }).join(', ');

    // Determine the actor id (if any) so we can attribute actions and avoid self-notifications
    const actorId = (afterData && afterData.updatedBy) || (beforeData && beforeData.updatedBy) || null;

    // Determine actor info to attribute actions properly (admin vs faculty)
    const firestoreDb = admin.firestore();
    let actorName: string | null = null;
    let actorRole: string | null = null;
    if (actorId && typeof actorId === 'string') {
      try {
        const actorDoc = await firestoreDb.collection('users').doc(actorId).get();
        if (actorDoc.exists) {
          const ad = actorDoc.data() as any;
          actorName = (ad && (ad.name || ad.displayName || ad.fullName)) ? (ad.name || ad.displayName || ad.fullName) : null;
          actorRole = ad?.role || null;
        }
      } catch (e) {
        logger.warn('Could not fetch actor user doc for attribution:', e);
      }
    }

    let shortMessage: string;
    if (actorRole === 'admin' && actorName) {
      // Admin performed the action; attribute to admin and mention the affected faculty
      shortMessage = `Admin ${actorName} updated the request for ${facultyName} (${classroomName} on ${date} ${startTime}${endTime ? `-${endTime}` : ''}): ${shortChangeSummary}`;
    } else {
      // Default / faculty-initiated message
      shortMessage = `${facultyName} updated their request for ${classroomName} on ${date} ${startTime}${endTime ? `-${endTime}` : ''}: ${shortChangeSummary}`;
    }

    const longMessage = (afterData.purpose || beforeData.purpose) ? `${shortMessage} Purpose: ${(afterData.purpose || beforeData.purpose)}` : shortMessage;

    const db = admin.firestore();
    const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (adminsSnap.empty) return { success: true, reason: 'no-admins' };

  // Use the helper to notify each admin individually. Pass actorId so actor-exclusion applies.
    const results = await Promise.allSettled(
      adminsSnap.docs.map((adoc) => persistAndSendNotification(adoc.id, 'info', longMessage, { bookingRequestId: afterSnap.id || beforeSnap.id || null, adminFeedback: null, actorId }))
    );
    const notified = results.reduce((count, r) => (r.status === 'fulfilled' && !(r.value && (r.value as any).skipped) ? count + 1 : count), 0);
    return { success: true, notified };
  } catch (err) {
    logger.error('Error in bookingRequestOnUpdateNotifyAdmins trigger:', err);
    return { success: false, error: String(err) };
  }
});

/**
 * Resets failed login attempts and unlocks an account after successful login
 * Called by the client after successful authentication
 */
export const resetFailedLogins = onCall(async (request: CallableRequest) => {
  // User must be authenticated to reset their own failed attempts
  if (!request.auth) {
    throw new HttpsError("unauthenticated",
      "User must be authenticated to reset failed login attempts");
  }

  const userId = request.auth.uid;

  try {
    logger.info(`Resetting failed login attempts for user: ${userId}`);

    const userDoc = admin.firestore().collection("users").doc(userId);
    const userData = await userDoc.get();

    if (!userData.exists) {
      logger.warn(`User document not found: ${userId}`);
      throw new HttpsError("not-found", "User document not found");
    }

    await userDoc.update({
      failedLoginAttempts: 0,
      accountLocked: false,
      lockedUntil: null,
      lastSignInAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Successfully reset failed login attempts for ${userId}`);

    return {
      success: true,
      message: "Failed login attempts reset successfully",
    };
  } catch (error: unknown) {
    const err = error as {message?: string};
    logger.error(`Error resetting failed logins for ${userId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal",
      `Failed to reset login attempts: ${err.message}`);
  }
});

/**
 * Admin-callable function to reset failed login attempts for any user
 * This is used when an admin unlocks a user's account to also clear the
 * Cloud Function brute force protection lock, not just the Firestore lock.
 * Only callable by admin users.
 */
export const adminResetFailedLogins = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  // Verify admin authentication
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  
  if (!callerDoc.exists) {
    throw new HttpsError("permission-denied", "Caller user data not found");
  }

  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admin users can reset failed logins for other users");
  }

  const { userId } = request.data || {};
  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument", "userId is required and must be a string");
  }

  try {
    logger.info(`Admin ${callerUid} resetting failed login attempts for user: ${userId}`);

    const userDoc = admin.firestore().collection("users").doc(userId);
    const userData = await userDoc.get();

    if (!userData.exists) {
      logger.warn(`User document not found: ${userId}`);
      throw new HttpsError("not-found", "User document not found");
    }

    // Reset all lock-related fields
    await userDoc.update({
      failedLoginAttempts: 0,
      accountLocked: false,
      lockedUntil: null,
      lockedByAdmin: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Admin ${callerUid} successfully reset failed login attempts for ${userId}`);

    return {
      success: true,
      message: "Failed login attempts reset successfully by admin",
    };
  } catch (error: unknown) {
    const err = error as {message?: string};
    logger.error(`Error resetting failed logins for ${userId}:`, error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal",
      `Failed to reset login attempts: ${err.message}`);
  }
});

/**
 * Sets custom claims for a user based on their role in Firestore.
 * This is called when a user's role is changed to sync the JWT token claims.
 * Only callable by admin users.
 */
export const setUserCustomClaims = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }

  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admin users can set custom claims');
  }

  const { userId } = request.data || {};
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId is required and must be a string');
  }

  try {
    // Get the target user's role from Firestore
    const targetDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!targetDoc.exists) {
      throw new HttpsError('not-found', 'Target user not found');
    }

    const targetData = targetDoc.data();
    const role = targetData?.role;

    // Set custom claims based on role
    const claims: { admin?: boolean; role?: string } = {
      role: role || 'faculty',
    };

    if (role === 'admin') {
      claims.admin = true;
    }

    await admin.auth().setCustomUserClaims(userId, claims);
    
    logger.info(`Custom claims updated for user ${userId} by admin ${callerUid}. Role: ${role}`);

    return { 
      success: true, 
      message: 'Custom claims updated successfully. User must sign out and sign in again for changes to take effect.',
      claims 
    };
  } catch (err: any) {
    logger.error('Error setting custom claims:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', `Failed to set custom claims: ${err.message}`);
  }
});

/**
 * Firestore trigger: Automatically update custom claims when a user's role changes.
 * This ensures JWT tokens stay in sync with Firestore role data.
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

export const syncUserRoleClaims = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;
  const after = event.data?.after;
  const before = event.data?.before;

  // If document was deleted, remove custom claims
  if (!after?.exists) {
    try {
      await admin.auth().setCustomUserClaims(userId, {});
      logger.info(`Removed custom claims for deleted user ${userId}`);
    } catch (err) {
      logger.error(`Failed to remove custom claims for deleted user ${userId}:`, err);
    }
    return;
  }

  const afterData = after.data();
  const beforeData = before?.exists ? before.data() : null;

  const newRole = afterData?.role;
  const oldRole = beforeData?.role;

  // Only update claims if role actually changed
  if (newRole === oldRole) {
    return;
  }

  try {
    const claims: { admin?: boolean; role?: string } = {
      role: newRole || 'faculty',
    };

    if (newRole === 'admin') {
      claims.admin = true;
    }

    await admin.auth().setCustomUserClaims(userId, claims);
    
    logger.info(`Auto-synced custom claims for user ${userId}. Old role: ${oldRole}, New role: ${newRole}`);
  } catch (err) {
    logger.error(`Failed to sync custom claims for user ${userId}:`, err);
  }
});

/**
 * Callable function to change a user's role.
 * Only callable by admin users.
 * Automatically triggers custom claims update via the Firestore trigger.
 */
export const changeUserRole = onCall(async (request: CallableRequest<{ userId?: string; newRole?: 'admin' | 'faculty' }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = request.auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'Caller user data not found');
  }

  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admin users can change roles');
  }

  const { userId, newRole } = request.data || {};
  
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId is required and must be a string');
  }

  if (!newRole || (newRole !== 'admin' && newRole !== 'faculty')) {
    throw new HttpsError('invalid-argument', 'newRole must be either "admin" or "faculty"');
  }

  // Prevent demoting yourself
  if (userId === callerUid && newRole === 'faculty') {
    throw new HttpsError('permission-denied', 'Admins cannot demote themselves');
  }

  try {
    const targetDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!targetDoc.exists) {
      throw new HttpsError('not-found', 'Target user not found');
    }

    // Update the role in Firestore (this will trigger syncUserRoleClaims)
    await admin.firestore().collection('users').doc(userId).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`User ${userId} role changed to ${newRole} by admin ${callerUid}`);

    return { 
      success: true, 
      message: `Role updated to ${newRole}. User must sign out and sign in again for changes to take effect.`,
      newRole 
    };
  } catch (err: any) {
    logger.error('Error changing user role:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', `Failed to change user role: ${err.message}`);
  }
});

/**
 * Utility callable to force refresh custom claims for a user (can be called by the user themselves).
 * This is useful after role changes to immediately reflect updated permissions.
 */
export const refreshMyCustomClaims = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = request.auth.uid;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User data not found');
    }

    const userData = userDoc.data();
    const role = userData?.role;

    const claims: { admin?: boolean; role?: string } = {
      role: role || 'faculty',
    };

    if (role === 'admin') {
      claims.admin = true;
    }

    await admin.auth().setCustomUserClaims(userId, claims);
    
    logger.info(`Custom claims refreshed for user ${userId}. Role: ${role}`);

    return { 
      success: true, 
      message: 'Custom claims refreshed. Please sign out and sign in again to apply changes.',
      claims 
    };
  } catch (err: any) {
    logger.error('Error refreshing custom claims:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', `Failed to refresh custom claims: ${err.message}`);
  }
});

// ========================================
// Rate Limiting Cloud Functions
// ========================================

/**
 * Check login rate limit
 * Limits: 10 login attempts per IP per 15 minutes
 * Stores rate limit data in Firestore collection: rateLimits/login/{ip}
 */
export const checkLoginRateLimit = onCall(async (request: CallableRequest) => {
  try {
    // Get IP from request context (available in firebase-functions v2)
    const ip = (request as any).rawRequest?.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;

    logger.info(`Checking login rate limit for IP: ${ip}`);

    const rateLimitRef = admin.firestore().collection('rateLimits').doc(`login_${ip}`);
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()!;
      const resetTime = data.resetTime?.toMillis() || 0;

      // Reset window if expired
      if (now > resetTime) {
        await rateLimitRef.set({
          attempts: 1,
          resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
          ip: ip,
          type: 'login',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
      }

      // Check if limit exceeded
      if (data.attempts >= maxAttempts) {
        logger.warn(`Login rate limit exceeded for IP: ${ip}`);
        return { 
          allowed: false, 
          remaining: 0, 
          resetAt: resetTime,
          error: 'Too many login attempts. Please try again later.'
        };
      }

      // Increment attempts
      await rateLimitRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { allowed: true, remaining: maxAttempts - (data.attempts + 1), resetAt: resetTime };
    }

    // First attempt
    await rateLimitRef.set({
      attempts: 1,
      resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
      ip: ip,
      type: 'login',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  } catch (err: any) {
    logger.error('Error checking login rate limit:', err);
    throw new HttpsError('internal', `Failed to check login rate limit: ${err.message}`);
  }
});

/**
 * Check booking rate limit
 * Limits: 5 booking requests per user per hour
 * Stores rate limit data in Firestore collection: rateLimits/booking/{userId}
 */
export const checkBookingRateLimit = onCall(async (request: CallableRequest) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxAttempts = 5;

    logger.info(`Checking booking rate limit for user: ${userId}`);

    const rateLimitRef = admin.firestore().collection('rateLimits').doc(`booking_${userId}`);
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()!;
      const resetTime = data.resetTime?.toMillis() || 0;

      // Reset window if expired
      if (now > resetTime) {
        await rateLimitRef.set({
          attempts: 1,
          resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
          userId: userId,
          type: 'booking',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
      }

      // Check if limit exceeded
      if (data.attempts >= maxAttempts) {
        logger.warn(`Booking rate limit exceeded for user: ${userId}`);
        return { 
          allowed: false, 
          remaining: 0, 
          resetAt: resetTime,
          error: 'Too many booking requests. Please try again later.'
        };
      }

      // Increment attempts
      await rateLimitRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { allowed: true, remaining: maxAttempts - (data.attempts + 1), resetAt: resetTime };
    }

    // First attempt
    await rateLimitRef.set({
      attempts: 1,
      resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
      userId: userId,
      type: 'booking',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  } catch (err: any) {
    logger.error('Error checking booking rate limit:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', `Failed to check booking rate limit: ${err.message}`);
  }
});

/**
 * Check admin action rate limit
 * Limits: 30 admin actions per user per minute
 * Stores rate limit data in Firestore collection: rateLimits/admin/{userId}
 */
export const checkAdminActionRateLimit = onCall(async (request: CallableRequest) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = request.auth.uid;
    
    // Verify admin role from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'User must be an admin');
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxAttempts = 30;

    logger.info(`Checking admin action rate limit for user: ${userId}`);

    const rateLimitRef = admin.firestore().collection('rateLimits').doc(`admin_${userId}`);
    const rateLimitDoc = await rateLimitRef.get();

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()!;
      const resetTime = data.resetTime?.toMillis() || 0;

      // Reset window if expired
      if (now > resetTime) {
        await rateLimitRef.set({
          attempts: 1,
          resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
          userId: userId,
          type: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
      }

      // Check if limit exceeded
      if (data.attempts >= maxAttempts) {
        logger.warn(`Admin action rate limit exceeded for user: ${userId}`);
        return { 
          allowed: false, 
          remaining: 0, 
          resetAt: resetTime,
          error: 'Too many admin actions. Please slow down.'
        };
      }

      // Increment attempts
      await rateLimitRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { allowed: true, remaining: maxAttempts - (data.attempts + 1), resetAt: resetTime };
    }

    // First attempt
    await rateLimitRef.set({
      attempts: 1,
      resetTime: admin.firestore.Timestamp.fromMillis(now + windowMs),
      userId: userId,
      type: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  } catch (err: any) {
    logger.error('Error checking admin action rate limit:', err);
    
    if (err instanceof HttpsError) {
      throw err;
    }

    throw new HttpsError('internal', `Failed to check admin action rate limit: ${err.message}`);
  }
});

// Export reCAPTCHA verification functions
export * from './recaptcha';
