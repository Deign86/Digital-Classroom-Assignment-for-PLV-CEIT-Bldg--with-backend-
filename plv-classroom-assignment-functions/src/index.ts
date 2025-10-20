import { scheduler } from 'firebase-functions/v2';

// Local typed shape matching firebase-functions v2 ScheduledEvent
type ScheduledEventLike = {
  jobName?: string;
  scheduleTime: string;
};
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// Minimal local types to avoid casting to `any` in a few server-side helpers
type DeletionLockDoc = { locked?: boolean; lockedBy?: string; timestamp?: number };
type BookingDocData = { date?: string; startTime?: string; endTime?: string; startAt?: any };

// Scheduled Cloud Function: run hourly to expire pending booking requests whose start time is in the past
export const expirePastPendingBookings = scheduler.onSchedule(
  { schedule: '0 * * * *', timeZone: 'Etc/UTC' },
  async (event: ScheduledEventLike) => {
    const now = admin.firestore.Timestamp.now();

    // IMPORTANT: Prefer a proper timestamp field (startAt) on booking requests.
    const snapshot = await db.collection('bookingRequests')
      .where('status', '==', 'pending')
      .get();

    const batch = db.batch();
    let changed = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, any>;

      let startTs: admin.firestore.Timestamp | null = null;
      if (data.startAt && data.startAt._seconds) {
        startTs = data.startAt as admin.firestore.Timestamp;
      } else if (data.startAt && data.startAt.seconds) {
        startTs = admin.firestore.Timestamp.fromMillis((data.startAt.seconds || 0) * 1000);
      } else if (data.date && data.startTime) {
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

import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as functions from 'firebase-functions';
import webpush from 'web-push';
import type { Request, Response } from 'express';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';

// Configure web-push with VAPID keys. Avoid calling functions.config() at module load time
// because functions.config() is not available in Cloud Functions v2 (gen2) and will
// cause the process to throw during startup. Prefer environment variables and only
// attempt to read functions.config() inside a try/catch as a best-effort fallback.
let VAPID_PUBLIC = process.env.PUSH_VAPID_PUBLIC || '';
let VAPID_PRIVATE = process.env.PUSH_VAPID_PRIVATE || '';
try {
  // try reading from functions.config() if it exists (v1 compatibility); swallow errors
  // so module init doesn't crash on gen2 runtimes.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const cfg = (typeof functions.config === 'function') ? functions.config().push : undefined;
  if (!VAPID_PUBLIC && cfg && cfg.vapid_public) VAPID_PUBLIC = cfg.vapid_public;
  if (!VAPID_PRIVATE && cfg && cfg.vapid_private) VAPID_PRIVATE = cfg.vapid_private;
} catch (e) {
  // Ignore: functions.config() not available in gen2. Environment vars should be used.
  logger.info('functions.config() not available or failed to read; using environment variables for VAPID');
}
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails('mailto:admin@plvceit.edu', VAPID_PUBLIC, VAPID_PRIVATE);
    logger.info('web-push VAPID configured via functions.config or env');
  } catch (e) {
    logger.error('Failed to configure web-push VAPID', e);
  }
} else {
  logger.warn('VAPID keys not configured. Set via environment variables PUSH_VAPID_PUBLIC and PUSH_VAPID_PRIVATE or functions config for v1 functions.');
}

// Helper: send a push to a PushSubscription JSON object. If subscription is invalid (410/404), remove it from Firestore.
async function sendPushToSubscription(subscription: any, payload: any, subscriptionDocRef?: admin.firestore.DocumentReference) {
  if (!subscription) return { ok: false, error: 'no-subscription' };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (error: any) {
    logger.error('web-push send error', error);
    // Clean up removed subscriptions (410 Gone or 404 Not Found)
    const statusCode = error && error.statusCode ? error.statusCode : (error && error.status ? error.status : undefined);
    if (subscriptionDocRef && (statusCode === 410 || statusCode === 404)) {
      try {
        await subscriptionDocRef.delete();
        logger.info('Removed invalid push subscription doc due to remote unsubscribe', { docId: subscriptionDocRef.id });
      } catch (delErr) {
        logger.warn('Failed to remove invalid subscription doc', delErr);
      }
    }
    return { ok: false, error };
  }
}

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
    signupRequestsQuery.docs.forEach((doc) => {
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

  // Firestore trigger: when bookingRequests doc is created/updated, if status changes to approved/rejected, notify the faculty via stored push subscriptions
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
    await db.runTransaction(async (tx) => {
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

    bookingSnap.docs.forEach((d) => {
      const data = d.data() as BookingDocData | undefined;
      const lapsed = !data ? false : isLapsed(data.date || '', data.endTime || '');
      if (!lapsed) toDeleteRefs.push(d.ref);
    });

    scheduleSnap.docs.forEach((d) => {
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
 * Registers a push subscription for the calling user (or an anonymous id).
 * Expected payload: { subscription: { endpoint: string, keys: { p256dh: string, auth: string } }, userId?: string }
 * If the caller is authenticated, the subscription will be stored under their uid.
 * Otherwise, a generated document id is used and the optional userId will be recorded.
 */
export const registerPush = onCall(async (request: CallableRequest<{ subscription?: any; userId?: string }>) => {
  const payload = request.data || {};
  const subscription = payload.subscription;

  if (!subscription || typeof subscription !== 'object') {
    throw new HttpsError('invalid-argument', 'subscription object is required');
  }

  // Minimal validation
  if (!subscription.endpoint || !subscription.keys || !subscription.keys.p256dh) {
    throw new HttpsError('invalid-argument', 'subscription must include endpoint and keys.p256dh');
  }

  try {
    const coll = admin.firestore().collection('pushSubscriptions');

    let docRef;
    if (request.auth && request.auth.uid) {
      // Save under user id to allow one subscription per user (overwrite existing)
      docRef = coll.doc(request.auth.uid);
      await docRef.set({
        subscription,
        uid: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      // Anonymous or pre-auth registration
      const userId = payload.userId && typeof payload.userId === 'string' ? payload.userId : undefined;
      docRef = await coll.add({
        subscription,
        uid: userId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    logger.error('registerPush error', error);
    throw new HttpsError('internal', 'Failed to register push subscription');
  }
});

// Admin-only callable to send a test push to all subscriptions for a given userId
export const testPush = onCall(async (request: CallableRequest<{ userId?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }

  // Determine admin by checking Firestore users/{uid}.role === 'admin'
  const callerUid = request.auth && request.auth.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Caller must be authenticated');
  }
  try {
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists) {
      throw new HttpsError('permission-denied', 'Caller user record not found');
    }
    const callerData = callerDoc.data();
    if (!callerData || callerData.role !== 'admin') {
      throw new HttpsError('permission-denied', 'testPush requires admin privileges');
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error('Failed to verify admin privileges for testPush', err);
    throw new HttpsError('internal', 'Failed to verify admin privileges');
  }

  const userId = request.data && request.data.userId;
  if (!userId || typeof userId !== 'string') {
    throw new HttpsError('invalid-argument', 'userId is required and must be a string');
  }

  try {
    const subsSnap = await admin.firestore().collection('pushSubscriptions').where('uid', '==', userId).get();
    if (subsSnap.empty) {
      return { ok: false, message: 'no-subscriptions' };
    }

    const payload = { title: 'Test Notification', body: 'This is a test push from admin', data: { test: true } };
    const results: Array<any> = [];
    for (const doc of subsSnap.docs) {
      const sub = doc.data().subscription;
      const res = await sendPushToSubscription(sub, payload, doc.ref);
      results.push({ docId: doc.id, result: res });
    }

    return { ok: true, results };
  } catch (error) {
    logger.error('testPush error', error);
    throw new HttpsError('internal', 'Failed to send test push');
  }
});

// Callable to return VAPID public key to clients. Allows clients to retrieve the public key
// from functions.config() so we don't need to bake it into the frontend build.
export const getVapidPublicKey = onCall(async (request: CallableRequest<{}>) => {
  try {
    if (!VAPID_PUBLIC) {
      logger.warn('getVapidPublicKey called but VAPID public key is not configured');
      return { ok: false, message: 'vapid-not-configured' };
    }
    return { ok: true, publicKey: VAPID_PUBLIC };
  } catch (error) {
    logger.error('getVapidPublicKey error', error);
    throw new HttpsError('internal', 'Failed to retrieve VAPID public key');
  }
  });

  // HTTP wrapper for getVapidPublicKey to support browser fetch + CORS preflight from localhost/dev hosts.
  // Restrict allowed origins via ALLOWED_CORS_ORIGINS environment variable (comma-separated).
  export const getVapidPublicKeyHttp = onRequest(async (req: Request, res: Response) => {
    const allowedEnv = process.env.ALLOWED_CORS_ORIGINS || '';
    const allowed = allowedEnv.split(',').map((s) => s.trim()).filter(Boolean);
    const origin = req.get('Origin') || req.get('origin');

    // If an Origin header is present, enforce the allowlist. If no Origin, treat as server-to-server and allow.
    if (origin) {
      if (allowed.length === 0 || !allowed.includes(origin)) {
        // Not allowed
        if (req.method === 'OPTIONS') return res.status(403).send('Origin not allowed');
        return res.status(403).json({ ok: false, message: 'origin-not-allowed' });
      }
      // Allowed origin: echo it back
      res.set('Access-Control-Allow-Origin', origin);
    }

    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    try {
      if (!VAPID_PUBLIC) {
        logger.warn('getVapidPublicKeyHttp called but VAPID public key is not configured');
        return res.status(500).json({ ok: false, message: 'vapid-not-configured' });
      }
      return res.json({ ok: true, publicKey: VAPID_PUBLIC });
    } catch (error: any) {
      logger.error('getVapidPublicKeyHttp error', error);
      return res.status(500).json({ ok: false, message: 'internal' });
    }
  });

  // HTTP wrapper for testPush to support browser fetch + CORS preflight. This endpoint expects
  // an Authorization: Bearer <idToken> header to authenticate the caller (same as callable would).
  // Restrict allowed origins via ALLOWED_CORS_ORIGINS environment variable (comma-separated).
  export const testPushHttp = onRequest(async (req: Request, res: Response) => {
    const allowedEnv = process.env.ALLOWED_CORS_ORIGINS || '';
    const allowed = allowedEnv.split(',').map((s) => s.trim()).filter(Boolean);
    const origin = req.get('Origin') || req.get('origin');

    if (origin) {
      if (allowed.length === 0 || !allowed.includes(origin)) {
        if (req.method === 'OPTIONS') return res.status(403).send('Origin not allowed');
        return res.status(403).json({ ok: false, message: 'origin-not-allowed' });
      }
      res.set('Access-Control-Allow-Origin', origin);
    }

    res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, message: 'method-not-allowed' });
    }

    try {
      const authHeader = (req.get('Authorization') || req.get('authorization') || '');
      const match = authHeader.match(/^Bearer\s+(.*)$/i);
      if (!match) {
        return res.status(401).json({ ok: false, message: 'unauthenticated' });
      }
      const idToken = match[1];
      let decoded: any;
      try {
        decoded = await admin.auth().verifyIdToken(idToken);
      } catch (e) {
        logger.warn('testPushHttp: invalid idToken', e);
        return res.status(401).json({ ok: false, message: 'unauthenticated' });
      }
      const callerUid = decoded.uid;
      // Verify admin role
      const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
      if (!callerDoc.exists) {
        return res.status(403).json({ ok: false, message: 'permission-denied' });
      }
      const callerData = callerDoc.data();
      if (!callerData || callerData.role !== 'admin') {
        return res.status(403).json({ ok: false, message: 'permission-denied' });
      }

      const { userId } = req.body || {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ ok: false, message: 'invalid-argument' });
      }

      const subsSnap = await admin.firestore().collection('pushSubscriptions').where('uid', '==', userId).get();
      if (subsSnap.empty) {
        return res.json({ ok: false, message: 'no-subscriptions' });
      }
      const payload = { title: 'Test Notification', body: 'This is a test push from admin (http)', data: { test: true } };
      const results: any[] = [];
      for (const doc of subsSnap.docs) {
        const sub = doc.data().subscription;
        const r = await sendPushToSubscription(sub, payload, doc.ref);
        results.push({ docId: doc.id, result: r });
      }
      return res.json({ ok: true, results });
    } catch (error: any) {
      logger.error('testPushHttp error', error);
      return res.status(500).json({ ok: false, message: 'internal' });
    }
  });

  // Firestore trigger: when bookingRequests doc is created/updated, if status changes to approved/rejected, notify the faculty via stored push subscriptions
export const onBookingRequestWrite = onDocumentWritten('bookingRequests/{requestId}', async (event: any) => {
  const beforeSnap = event.data?.before ?? null;
  const afterSnap = event.data?.after ?? null;
  const before = beforeSnap && (beforeSnap as any).exists ? (beforeSnap as any).data() as any : null;
  const after = afterSnap && (afterSnap as any).exists ? (afterSnap as any).data() as any : null;
  if (!after) return null;

  const prevStatus = before ? before.status : null;
  const newStatus = after.status;
  if (prevStatus === newStatus) return null;

  if (newStatus !== 'approved' && newStatus !== 'rejected') return null;

  const facultyId = after.facultyId;
  const title = newStatus === 'approved' ? 'Booking Approved' : 'Booking Rejected';
  const body = `${title} — ${after.classroomName} on ${after.date} ${after.startTime} - ${after.endTime}`;

  try {
    const subsSnapshot = await db.collection('pushSubscriptions').where('uid', '==', facultyId).get();
    if (subsSnapshot.empty) {
      logger.info(`No push subscriptions found for user ${facultyId}`);
      return null;
    }

    const requestId = event.data?.params?.requestId ?? null;
    const payload = { title, body, data: { requestId, url: '/' } };

    const results = await Promise.all(subsSnapshot.docs.map(async (doc) => {
      const data = doc.data();
      return sendPushToSubscription(data.subscription, payload);
    }));

    const failures = results.filter((r: any) => !r.ok);
    if (failures.length) {
      logger.warn(`Some push sends failed for request ${requestId}`, { failuresCount: failures.length });
    }
    return { success: true, sent: results.length, failures: failures.length };
  } catch (error) {
    logger.error('onBookingRequestWrite error', error);
    return null;
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
