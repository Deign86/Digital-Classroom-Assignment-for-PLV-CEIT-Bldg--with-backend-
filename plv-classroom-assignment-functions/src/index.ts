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
