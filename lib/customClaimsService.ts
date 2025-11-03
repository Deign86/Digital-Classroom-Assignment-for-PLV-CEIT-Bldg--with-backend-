import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from './firebaseConfig';

/**
 * Service for managing custom claims and token refresh
 */

/**
 * Force refresh the current user's ID token to get updated custom claims
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
 * Get the current user's custom claims
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
 * Check if the current user has admin custom claims
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const claims = await getCurrentUserClaims();
  return claims?.admin === true;
};

/**
 * Call the backend to refresh custom claims based on current Firestore role
 */
export const refreshMyCustomClaims = async (): Promise<void> => {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable(functions, 'refreshMyCustomClaims');
  
  await callable({});
  
  // After backend updates claims, force refresh the token
  await forceTokenRefresh();
};

/**
 * Admin function: Set custom claims for another user
 */
export const setUserCustomClaims = async (userId: string): Promise<void> => {
  const functions = getFunctions(getFirebaseApp());
  const callable = httpsCallable(functions, 'setUserCustomClaims');
  
  await callable({ userId });
};

/**
 * Admin function: Change a user's role (automatically updates custom claims)
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
 * Check if custom claims need refresh by comparing with Firestore role
 */
export const checkClaimsSyncStatus = async (firestoreRole: 'admin' | 'faculty'): Promise<{
  inSync: boolean;
  tokenRole?: string;
  tokenAdmin?: boolean;
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
