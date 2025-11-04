import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './firebaseConfig';

/**
 * Service for managing Firebase custom claims and token refresh.
 * 
 * Custom claims are JWT token claims that control user permissions
 * and roles in Firebase. This service helps synchronize these claims
 * with Firestore role data and provides utilities for role management.
 */

/**
 * Forces a refresh of the current user's ID token to retrieve updated custom claims.
 * 
 * Call this after backend operations that modify custom claims to ensure
 * the client has the latest permissions.
 * 
 * @throws Error if no user is currently signed in
 * 
 * @example
 * ```typescript
 * // After role change
 * await changeUserRole(userId, 'admin');
 * await forceTokenRefresh(); // Get new token with admin claim
 * ```
 */
export const forceTokenRefresh = async (): Promise<void> => {
  const auth = getAuth(getFirebaseApp());
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  // Force refresh the token
  await user.getIdToken(true);
};

/**
 * Retrieves the current user's custom claims from their ID token.
 * 
 * @returns Object containing admin and role claims, or null if no user is signed in
 * 
 * @example
 * ```typescript
 * const claims = await getCurrentUserClaims();
 * if (claims?.admin) {
 *   // Show admin features
 * }
 * ```
 */
export const getCurrentUserClaims = async (): Promise<{ admin?: boolean; role?: string } | null> => {
  const auth = getAuth(getFirebaseApp());
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  const idTokenResult = await user.getIdTokenResult();
  return {
    admin: idTokenResult.claims.admin as boolean | undefined,
    role: idTokenResult.claims.role as string | undefined,
  };
};

/**
 * Checks if the current user has the admin custom claim.
 * 
 * @returns true if the user has admin claim, false otherwise
 * 
 * @example
 * ```typescript
 * if (await isCurrentUserAdmin()) {
 *   // Grant access to admin dashboard
 * }
 * ```
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const claims = await getCurrentUserClaims();
  return claims?.admin === true;
};

/**
 * Calls the backend to refresh custom claims based on the current Firestore role.
 * 
 * This ensures the user's JWT token claims match their Firestore user document.
 * Automatically forces a token refresh after updating claims on the backend.
 * 
 * @throws Error if the Cloud Function call fails
 * 
 * @example
 * ```typescript
 * // After manual role update in Firestore
 * await refreshMyCustomClaims();
 * // User's token now reflects updated role
 * ```
 */
export const refreshMyCustomClaims = async (): Promise<void> => {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable(functions, 'refreshMyCustomClaims');
  
  await callable({});
  
  // After backend updates claims, force refresh the token
  await forceTokenRefresh();
};

/**
 * Admin function: Sets custom claims for a specific user by syncing with Firestore.
 * 
 * Requires admin privileges to execute. Updates the target user's JWT claims
 * based on their current Firestore role.
 * 
 * @param userId - The Firebase Auth UID of the user to update
 * @throws Error if caller lacks admin privileges or if the operation fails
 * 
 * @example
 * ```typescript
 * // Admin updating another user's claims
 * await setUserCustomClaims('user123');
 * ```
 */
export const setUserCustomClaims = async (userId: string): Promise<void> => {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable(functions, 'setUserCustomClaims');
  
  await callable({ userId });
};

/**
 * Admin function: Changes a user's role and automatically updates their custom claims.
 * 
 * This is the primary way to modify user permissions. It updates both the
 * Firestore user document and the JWT custom claims atomically.
 * 
 * @param userId - The Firebase Auth UID of the user
 * @param newRole - The new role to assign ('admin' or 'faculty')
 * @returns Object with success status and message
 * @throws Error if caller lacks admin privileges or if the operation fails
 * 
 * @example
 * ```typescript
 * const result = await changeUserRole('user123', 'admin');
 * if (result.success) {
 *   console.log(result.message); // "Role updated successfully"
 * }
 * ```
 */
export const changeUserRole = async (
  userId: string, 
  newRole: 'admin' | 'faculty'
): Promise<{ success: boolean; message: string }> => {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable<{ userId: string; newRole: 'admin' | 'faculty' }, { success: boolean; message: string }>(
    functions, 
    'changeUserRole'
  );
  
  const result = await callable({ userId, newRole });
  return result.data;
};

/**
 * Checks if custom claims are synchronized with the Firestore role.
 * 
 * Useful for detecting when a token refresh is needed after role changes.
 * Compares the JWT token claims with the expected role from Firestore.
 * 
 * @param firestoreRole - The current role from the Firestore user document
 * @returns Sync status object with details about token and Firestore roles
 * 
 * @example
 * ```typescript
 * const status = await checkClaimsSyncStatus(user.role);
 * if (!status.inSync) {
 *   // Prompt user to refresh or auto-refresh token
 *   await forceTokenRefresh();
 * }
 * ```
 */
export const checkClaimsSyncStatus = async (firestoreRole: 'admin' | 'faculty'): Promise<{
  /** Whether token claims match Firestore role */
  inSync: boolean;
  /** Role claim from JWT token */
  tokenRole?: string;
  /** Admin claim from JWT token */
  tokenAdmin?: boolean;
  /** Role from Firestore user document */
  firestoreRole: string;
}> => {
  const claims = await getCurrentUserClaims();
  
  const expectedAdmin = firestoreRole === 'admin';
  const actualAdmin = claims?.admin === true;
  const actualRole = claims?.role;
  
  const inSync = actualAdmin === expectedAdmin && actualRole === firestoreRole;
  
  return {
    inSync,
    tokenRole: actualRole,
    tokenAdmin: actualAdmin,
    firestoreRole,
  };
};

/**
 * Complete custom claims service interface.
 * 
 * Provides all functions needed for managing Firebase custom claims
 * and role-based access control in the application.
 */
export const customClaimsService = {
  forceTokenRefresh,
  getCurrentUserClaims,
  isCurrentUserAdmin,
  refreshMyCustomClaims,
  setUserCustomClaims,
  changeUserRole,
  checkClaimsSyncStatus,
};

export default customClaimsService;
