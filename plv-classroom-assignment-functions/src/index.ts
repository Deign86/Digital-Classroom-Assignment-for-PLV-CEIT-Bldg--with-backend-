import { scheduler } from 'firebase-functions/v2';

// Local typed shape matching firebase-functions v2 ScheduledEvent
type ScheduledEventLike = {
  jobName?: string;
  scheduleTime: string;
};
import * as admin from 'firebase-admin';
import type { QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';

admin.initializeApp();
const db = admin.firestore();

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

    // Delete any pending signup requests for this user
    const signupRequestsQuery = await admin.firestore()
      .collection("signupRequests")
      .where("userId", "==", userId)
      .get();

    const batch = admin.firestore().batch();
  signupRequestsQuery.docs.forEach((doc: QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    if (!signupRequestsQuery.empty) {
      await batch.commit();
      const count = signupRequestsQuery.size;
      logger.info(`Deleted ${count} signup request(s) for user ${userId}`);
    }

    return {
      success: true,
      message: `User account ${userId} has been completely deleted`,
      deletedAuthAccount: true,
      deletedFirestoreDoc: true,
      deletedSignupRequests: signupRequestsQuery.size,
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

    // Create notification for faculty via the centralized createNotification callable.
    // This ensures actor-exclusion (actor won't receive their own notification) and FCM sending.
    try {
      if (data && data.facultyId) {
        if (callerUid && callerUid === data.facultyId) {
          // The owner cancelled their own booking; no notification needed
          logger.info(`Skipping faculty notification for ${data.facultyId} because they performed the cancellation`);
        } else {
          // Include admin name (if available) in the message for clearer attribution
          const adminName = (callerData && (callerData.name || callerData.displayName)) ? (callerData.name || callerData.displayName) : 'an administrator';
          const message = `Admin ${adminName} cancelled your approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime}.`;

          // Call the createNotification callable as the server actor to handle persistence + FCM
          // Note: createNotification callable requires the caller to be an admin. We're within a callable
          // already authenticated as the caller, so we'll invoke the same function programmatically via the
          // Admin SDK by writing to the `notifications` collection through the callable to preserve behavior.
          // Instead of duplicating the callable logic here, use the Admin SDK to call the callable endpoint
          // is not available from server code; instead, mimic the expected payload and call the internal
          // helper by writing the same document and letting the createNotification callable handle FCM.
          // However, to keep behavior consistent and avoid duplication, we'll call the createNotification
          // logic by programmatically invoking the functions framework via an HTTP call is unnecessary here.

          // Simplest reliable approach: call admin.firestore().collection('notifications').add(...) AND
          // trigger FCM send similarly to createNotification — but to avoid duplication we've implemented
          // a server-side helper below: use the same FCM send code path as in createNotification.

          // For now, call the createNotification callable using the Functions REST API via the Admin SDK's
          // Google API client is heavier; instead, reuse the same behavior by adding the notification document
          // and then attempting to send FCM to registered tokens, but ensure we include actorId to allow other
          // triggers to know who acted. This mirrors the previous behavior while including actor metadata.

          // Use shared helper to persist notification and attempt FCM send. Pass actorId
          try {
            await persistAndSendNotification(data.facultyId, 'cancelled', message, { bookingRequestId: null, adminFeedback: feedback, actorId: callerUid });
          } catch (helperErr) {
            logger.warn('Failed to create/send faculty notification via helper in cancelApprovedBooking', helperErr);
          }
        }
      }
    } catch (err) {
      logger.warn('Failed to create faculty notification in cancelApprovedBooking', err);
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
  if (!type || (type !== 'approved' && type !== 'rejected' && type !== 'info' && type !== 'cancelled' && type !== 'signup')) {
    throw new HttpsError('invalid-argument', "type must be 'approved', 'rejected', 'info', 'cancelled' or 'signup'");
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
              logger.error('No compatible FCM multicast/sendAll/sendToDevice method available on admin.messaging()');
            }
          } catch (sendErr) {
            // Re-throw / log original FCM send errors with context
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
