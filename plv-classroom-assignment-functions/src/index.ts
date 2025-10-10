/**
 * Firebase Cloud Functions for PLV Classroom Assignment System
 * Provides admin-level user management capabilities using Firebase Admin SDK
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

// Constants for brute force protection
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Deletes a user's Firebase Auth account and all associated Firestore data
 * Only callable by authenticated admin users
 */
export const deleteUserAccount = onCall(async (request) => {
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

  const {userId} = request.data;
  if (!userId || typeof userId !== "string") {
    throw new HttpsError("invalid-argument",
      "userId is required and must be a string");
  }

  try {
    const msg = `Admin ${callerUid} attempting to delete user ${userId}`;
    logger.info(msg);

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
 * Tracks failed login attempts and locks accounts after too many failures
 * Called by the client after a failed login attempt
 */
export const trackFailedLogin = onCall(async (request) => {
  const {email} = request.data;

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
export const resetFailedLogins = onCall(async (request) => {
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
