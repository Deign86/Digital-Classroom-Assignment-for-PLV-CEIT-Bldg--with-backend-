import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
  type QuerySnapshot,
  type DocumentReference,
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  updateProfile,
  type Auth,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import notificationServiceImport from './notificationService';
import type { BookingRequest, Classroom, Schedule, SignupRequest, SignupHistory, User } from '../App';
import { getFirebaseDb, getFirebaseApp } from './firebaseConfig';
import { isPastBookingTime } from '../utils/timeUtils';
import withRetry, { isNetworkError } from './withRetry';
import { logger } from './logger';

/**
 * Firebase Service - Main data layer for the Digital Classroom Assignment system.
 * 
 * This service provides a complete abstraction layer over Firebase Authentication
 * and Firestore, offering:
 * - User authentication and management
 * - Classroom and booking request operations
 * - Schedule management
 * - Signup request handling
 * - Real-time data synchronization
 * - Role-based access control integration
 * 
 * All operations include automatic retry logic for network resilience
 * and proper error handling.
 */

const db = () => getFirebaseDb();

let authInstance: Auth | null = null;

const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
};

// This is no longer needed with role-based security rules.
// const ADMIN_EMAILS = (import.meta.env.VITE_FIREBASE_ADMIN_EMAILS ?? '')
//   .split(',')
//   .map((email: string) => email.trim().toLowerCase())
//   .filter(Boolean);

/**
 * Firestore collection names used throughout the application
 */
const COLLECTIONS = {
  USERS: 'users',
  CLASSROOMS: 'classrooms',
  BOOKING_REQUESTS: 'bookingRequests',
  SCHEDULES: 'schedules',
  SIGNUP_REQUESTS: 'signupRequests',
  SIGNUP_HISTORY: 'signupHistory',
} as const;

let dbInstance: Firestore | null = null;
let dbInitError: Error | null = null;

const getDb = (): Firestore => {
  if (dbInitError) {
    throw dbInitError;
  }

  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = getFirebaseDb();
    return dbInstance;
  } catch (error) {
    dbInitError = error instanceof Error ? error : new Error(String(error));
    throw dbInitError;
  }
};

type UserRole = User['role'];

type FirestoreUserRecord = {
  email: string;
  emailLower: string;
  name: string;
  role: UserRole;
  department?: string;
  departments?: string[];
  status: 'pending' | 'approved' | 'rejected';
  photoURL?: string;
  lastSignInAt?: string;
  createdAt?: string;
  updatedAt?: string;
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  lockedUntil?: string;
  // Indicates the account was explicitly disabled by an administrator (manual lock).
  // When true, the account should not auto-unlock — an admin must re-enable it.
  lockedByAdmin?: boolean;
  pushEnabled?: boolean;
};

type FirestoreClassroomRecord = {
  name: string;
  capacity: number;
  equipment: string[];
  building: string;
  floor: number;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type FirestoreBookingRequestRecord = {
  facultyId: string;
  facultyName: string;
  classroomId: string;
  classroomName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: BookingRequest['status'];
  requestDate: string;
  adminFeedback?: string;
  createdAt?: string;
  updatedAt?: string;
  // optional actor id who performed the update (used to avoid self-notifications)
  updatedBy?: string | null;
};

type FirestoreScheduleRecord = {
  classroomId: string;
  classroomName: string;
  facultyId: string;
  facultyName: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: Schedule['status'];
  createdAt?: string;
  updatedAt?: string;
};

type FirestoreSignupRequestRecord = {
  uid: string;
  email: string;
  emailLower: string;
  name: string;
  department: string;
  departments?: string[];
  requestDate: string;
  status: SignupRequest['status'];
  adminFeedback?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type FirestoreSignupHistoryRecord = {
  uid: string;
  email: string;
  emailLower: string;
  name: string;
  department: string;
  requestDate: string;
  status: 'approved' | 'rejected';
  adminFeedback: string;
  resolvedAt: string;
  processedBy: string;
  createdAt?: string;
  updatedAt?: string;
};

let currentUserCache: User | null = null;

type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();

// Real-time listener types
type DataListener<T> = (data: T[]) => void;
type DataErrorCallback = (error: Error) => void;

// Real-time listener management
const dataListeners = {
  classrooms: new Set<DataListener<Classroom>>(),
  bookingRequests: new Set<DataListener<BookingRequest>>(),
  schedules: new Set<DataListener<Schedule>>(),
  signupRequests: new Set<DataListener<SignupRequest>>(),
  users: new Set<DataListener<User>>(),
};

let activeUnsubscribes: Unsubscribe[] = [];
// Tracks which user's listeners are currently registered to avoid redundant setups
let currentRealtimeUserId: string | null = null;

const unsubscribeAllListeners = () => {
  logger.log(`Unsubscribing from ${activeUnsubscribes.length} real-time listeners.`);
  activeUnsubscribes.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (error) {
      logger.warn('Error during listener unsubscribe:', error);
    }
  });
  activeUnsubscribes = [];
  currentRealtimeUserId = null;
};

// Real-time data notification helpers
const notifyDataListeners = <T>(
  listenerSet: Set<DataListener<T>>, 
  data: T[], 
  errorCallback?: DataErrorCallback
) => {
  listenerSet.forEach((listener) => {
    try {
      listener(data);
    } catch (error) {
      logger.error('Data listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  });
};

// Real-time listener setup functions
const setupClassroomsListener = (callback: DataListener<Classroom>, errorCallback?: DataErrorCallback) => {
  const database = getDb();
  const classroomsRef = collection(database, COLLECTIONS.CLASSROOMS);
  const q = query(classroomsRef, orderBy('name'));
  
  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      const classrooms = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreClassroomRecord;
        return toClassroom(doc.id, data);
      });
      callback(classrooms);
    } catch (error) {
      logger.error('Classrooms listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('Classrooms listener error:', error);
    errorCallback?.(error);
  });
  
  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const setupBookingRequestsListener = (
  callback: DataListener<BookingRequest>, 
  errorCallback?: DataErrorCallback,
  facultyId?: string
) => {
  const database = getDb();
  const bookingRequestsRef = collection(database, COLLECTIONS.BOOKING_REQUESTS);
  
  let q;
  if (facultyId) {
    // Faculty-specific listener
    q = query(bookingRequestsRef, where('facultyId', '==', facultyId), orderBy('requestDate', 'desc'));
  } else {
    // Admin listener (all requests)
    q = query(bookingRequestsRef, orderBy('requestDate', 'desc'));
  }
  
  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      // Deduplicate at service layer to reduce component overhead
      const seen = new Set<string>();
      const requests: BookingRequest[] = [];
      
      snapshot.docs.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          const data = doc.data() as FirestoreBookingRequestRecord;
          requests.push(toBookingRequest(doc.id, data));
        } else {
          logger.warn(`⚠️ Duplicate booking request filtered at service layer: ${doc.id}`);
        }
      });
      
      callback(requests);
    } catch (error) {
      logger.error('BookingRequests listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('BookingRequests listener error:', error);
    errorCallback?.(error);
  });
  
  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const setupSchedulesListener = (
  callback: DataListener<Schedule>, 
  errorCallback?: DataErrorCallback,
  facultyId?: string
) => {
  const database = getDb();
  const schedulesRef = collection(database, COLLECTIONS.SCHEDULES);
  
  let q;
  if (facultyId) {
    // Faculty-specific listener
    q = query(schedulesRef, where('facultyId', '==', facultyId), orderBy('date'), orderBy('startTime'));
  } else {
    // Admin listener (all schedules)
    q = query(schedulesRef, orderBy('date'), orderBy('startTime'));
  }
  
  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      const schedules = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreScheduleRecord;
        return toSchedule(doc.id, data);
      });
      callback(schedules);
    } catch (error) {
      logger.error('Schedules listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('Schedules listener error:', error);
    errorCallback?.(error);
  });
  
  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const setupSignupRequestsListener = (callback: DataListener<SignupRequest>, errorCallback?: DataErrorCallback) => {
  const database = getDb();
  const signupRequestsRef = collection(database, COLLECTIONS.SIGNUP_REQUESTS);
  const q = query(signupRequestsRef, orderBy('requestDate', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreSignupRequestRecord;
        return toSignupRequest(doc.id, data);
      });
      callback(requests);
    } catch (error) {
      logger.error('SignupRequests listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('SignupRequests listener error:', error);
    errorCallback?.(error);
  });
  
  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const setupSignupHistoryListener = (callback: DataListener<import('../App').SignupHistory>, errorCallback?: DataErrorCallback) => {
  const database = getDb();
  const signupHistoryRef = collection(database, COLLECTIONS.SIGNUP_HISTORY);
  const q = query(signupHistoryRef, orderBy('resolvedAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      const history = snapshot.docs.map((doc) => {
        const data = doc.data() as any;
        return toSignupHistory(doc.id, data);
      });
      callback(history);
    } catch (error) {
      logger.error('SignupHistory listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('SignupHistory listener error:', error);
    errorCallback?.(error instanceof Error ? error : new Error(String(error)));
  });

  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const setupUsersListener = (callback: DataListener<User>, errorCallback?: DataErrorCallback) => {
  const database = getDb();
  const usersRef = collection(database, COLLECTIONS.USERS);
  const q = query(usersRef, orderBy('name'));
  
  const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
    try {
      const users = snapshot.docs.map((doc) => {
        const record = ensureUserData(doc);
        return toUser(doc.id, record);
      });
      callback(users);
    } catch (error) {
      logger.error('Users listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    logger.error('Users listener error:', error);
    errorCallback?.(error);
  });
  
  activeUnsubscribes.push(unsubscribe);
  return unsubscribe;
};

const notifyAuthListeners = (user: User | null) => {
  authListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (error) {
      logger.error('Auth listener error:', error);
    }
  });
};

const nowIso = () => new Date().toISOString();

/**
 * Removes undefined values from update objects to prevent Firestore errors.
 * 
 * Firestore doesn't allow undefined values, so this utility cleans objects
 * before sending them to the database.
 * 
 * @param obj - Object potentially containing undefined values
 * @returns New object with undefined values removed
 */
const removeUndefinedValues = <T>(obj: Partial<T>): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};

/**
 * Performs bulk updates on Firestore documents using a batch operation.
 * 
 * Uses Firestore writeBatch for atomic multi-document updates. Each document
 * is updated using set() with merge:true to safely apply partial updates
 * and create documents if they don't exist.
 * 
 * @param collectionName - Name of the Firestore collection
 * @param updates - Array of document IDs and their update data
 * @throws Error if batch commit fails
 * 
 * @example
 * ```typescript
 * await bulkUpdateDocs('users', [
 *   { id: 'user1', data: { status: 'approved' } },
 *   { id: 'user2', data: { status: 'approved' } }
 * ]);
 * ```
 */
export const bulkUpdateDocs = async (
  collectionName: string,
  updates: Array<{ id: string; data: Record<string, unknown> }>
): Promise<void> => {
  if (!updates || updates.length === 0) return;
  const database = getDb();
  const batch = writeBatch(database);

  for (const u of updates) {
    const ref = doc(database, collectionName, u.id);
    const cleaned = removeUndefinedValues(u.data as any) as Record<string, unknown>;
    // Use set with merge to avoid failing when doc is missing and to only update provided fields
    batch.set(ref, { ...cleaned, updatedAt: nowIso() } as Record<string, unknown>, { merge: true } as any);
  }

  await batch.commit();
};

const sanitizeUserUpdate = (record: Partial<FirestoreUserRecord>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;

// This function is no longer needed with role-based security rules.
// const isConfiguredAdminEmail = (email?: string | null): boolean => {
//   if (!email) {
//     return false;
//   }
//   return ADMIN_EMAILS.includes(email.toLowerCase());
// };

class AuthStatusError extends Error {
  status: 'pending' | 'rejected';

  constructor(status: 'pending' | 'rejected', message: string) {
    super(message);
    this.name = 'AuthStatusError';
    this.status = status;
  }
}

const toUser = (id: string, data: FirestoreUserRecord): User => ({
  id,
  email: data.email,
  name: data.name,
  role: data.role,
  department: data.department,
  departments: data.departments,
  status: data.status,
  failedLoginAttempts: data.failedLoginAttempts || 0,
  accountLocked: data.accountLocked || false,
  lockedUntil: data.lockedUntil,
  // carry admin-lock indicator to client runtime
  lockedByAdmin: !!data.lockedByAdmin,
  // Carry push preference through to the runtime user object
  pushEnabled: data.pushEnabled,
  // Expose lastSignInAt so callers can infer recent activity (used to prompt re-login)
  lastSignInAt: data.lastSignInAt,
});

const ensureUserData = (snapshot: DocumentSnapshot<DocumentData>): FirestoreUserRecord => {
  const data = snapshot.data();
  if (!data) {
    throw new Error('User record is missing.');
  }
  return data as FirestoreUserRecord;
};

const fetchUserDocByEmail = async (
  email: string
): Promise<{ id: string; record: FirestoreUserRecord } | null> => {
  const emailLower = email.toLowerCase();
  const database = getDb();
  const usersRef = collection(database, COLLECTIONS.USERS);
  const q = query(usersRef, where('emailLower', '==', emailLower));
  const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });

  if (snapshot.empty) {
    return null;
  }

  const docSnapshot = snapshot.docs[0];
  const record = ensureUserData(docSnapshot);
  return { id: docSnapshot.id, record };
};

const fetchUserById = async (id: string): Promise<User | null> => {
  const database = getDb();
  const ref = doc(database, COLLECTIONS.USERS, id);
  const snapshot = await withRetry(() => getDoc(ref), { attempts: 3, shouldRetry: isNetworkError });
  if (!snapshot.exists()) {
    return null;
  }
  const record = ensureUserData(snapshot);
  return toUser(snapshot.id, record);
};

const toClassroom = (
  id: string,
  data: FirestoreClassroomRecord
): Classroom => ({
  id,
  name: data.name,
  capacity: data.capacity,
  equipment: Array.isArray(data.equipment) ? data.equipment : [],
  building: data.building,
  floor: data.floor,
  isAvailable: data.isAvailable,
});

const toBookingRequest = (
  id: string,
  data: FirestoreBookingRequestRecord
): BookingRequest => ({
  id,
  facultyId: data.facultyId,
  facultyName: data.facultyName,
  classroomId: data.classroomId,
  classroomName: data.classroomName,
  date: data.date,
  startTime: data.startTime,
  endTime: data.endTime,
  purpose: data.purpose,
  status: data.status,
  requestDate: data.requestDate,
  adminFeedback: data.adminFeedback,
});

const toSchedule = (id: string, data: FirestoreScheduleRecord): Schedule => ({
  id,
  classroomId: data.classroomId,
  classroomName: data.classroomName,
  facultyId: data.facultyId,
  facultyName: data.facultyName,
  date: data.date,
  startTime: data.startTime,
  endTime: data.endTime,
  purpose: data.purpose,
  status: data.status,
});

const toSignupRequest = (
  id: string,
  data: FirestoreSignupRequestRecord
): SignupRequest => ({
  id,
  userId: data.uid,
  email: data.email,
  name: data.name,
  department: data.department,
  requestDate: data.requestDate,
  status: data.status,
  adminFeedback: data.adminFeedback,
  resolvedAt: data.resolvedAt,
});

const toSignupHistory = (
  id: string,
  data: FirestoreSignupHistoryRecord
): SignupHistory => ({
  id,
  userId: data.uid,
  email: data.email,
  name: data.name,
  department: data.department,
  requestDate: data.requestDate,
  status: data.status,
  adminFeedback: data.adminFeedback,
  resolvedAt: data.resolvedAt,
  processedBy: data.processedBy,
});

// ============================================
// AUTHENTICATION SERVICE
// ============================================

let authStateInitialized = false;
let authStateReadyPromise: Promise<void> | null = null;
let authStateReadyResolve: (() => void) | null = null;
// When true, the onAuthStateChanged handler will ignore state changes.
// This is used to prevent race conditions when the app programmatically
// creates or signs in a user (e.g., during registration/reactivation).
let suppressAuthStateHandling = false;

const ensureUserRecordFromAuth = async (
  firebaseUser: FirebaseAuthUser,
  overrides: Partial<FirestoreUserRecord> = {}
): Promise<FirestoreUserRecord> => {
  const database = getDb();
  const userRef = doc(database, COLLECTIONS.USERS, firebaseUser.uid);
  const snapshot = await getDoc(userRef);

  const email = overrides.email ?? firebaseUser.email;
  if (!email) {
    throw new Error('Authenticated user is missing an email address.');
  }

  const emailLower = email.toLowerCase();
  const now = nowIso();

  if (!snapshot.exists()) {
    const isAdmin = overrides.role === 'admin';
    
    // Check if there's an approved signup request for this user
    let defaultStatus: FirestoreUserRecord['status'] = isAdmin ? 'approved' : 'pending';
    let defaultDepartment = overrides.department;
    let defaultName = overrides.name ?? firebaseUser.displayName ?? email;
    
    if (!isAdmin && !overrides.status) {
      try {
        const signupRequest = await signupRequestService.getById(firebaseUser.uid);
        if (signupRequest && signupRequest.status === 'approved') {
          defaultStatus = 'approved';
          defaultDepartment = defaultDepartment || signupRequest.department;
          defaultName = overrides.name || signupRequest.name || firebaseUser.displayName || email;
        }
      } catch (error) {
        // If we can't fetch signup request, default to pending
        logger.warn('Could not fetch signup request for user:', firebaseUser.uid, error);
      }
    }
    
    const record: FirestoreUserRecord = {
      email,
      emailLower,
      name: defaultName,
      role: overrides.role ?? (isAdmin ? 'admin' : 'faculty'),
      department: defaultDepartment,
      status: overrides.status ?? defaultStatus,
      photoURL: overrides.photoURL ?? firebaseUser.photoURL ?? undefined,
      lastSignInAt: now,
      createdAt: now,
      updatedAt: now,
    };

    // Remove undefined values before saving to Firestore
    const sanitizedRecord = sanitizeUserUpdate(record) as FirestoreUserRecord;
    await setDoc(userRef, sanitizedRecord);
    return sanitizedRecord;
  }

  const existing = ensureUserData(snapshot);

  // If the user exists, prepare updates.
  // Preserve existing role and status unless explicitly overridden.
  const updates: Partial<FirestoreUserRecord> = {
    ...overrides, // Apply explicit overrides first
    lastSignInAt: now,
    updatedAt: now,
  };

  // Ensure role and status are not accidentally cleared
  if (updates.role === undefined) {
    updates.role = existing.role;
  }
  if (updates.status === undefined) {
    updates.status = existing.status;
  }

  if (firebaseUser.displayName && firebaseUser.displayName !== existing.name) {
    updates.name = firebaseUser.displayName;
  }

  if (firebaseUser.photoURL && firebaseUser.photoURL !== existing.photoURL) {
    updates.photoURL = firebaseUser.photoURL;
  }

  const sanitized = sanitizeUserUpdate(updates);

  // Only write to Firestore if there are actual changes to avoid unnecessary writes
  const hasChanges = Object.keys(sanitized).some(
    key => key !== 'lastSignInAt' && key !== 'updatedAt' && sanitized[key as keyof typeof sanitized] !== existing[key as keyof typeof existing]
  );

  if (hasChanges || !existing.lastSignInAt) {
    await updateDoc(userRef, sanitized);
    return { ...existing, ...sanitized } as FirestoreUserRecord;
  }

  return existing;
};

const ensureAuthStateListener = () => {
  if (authStateInitialized) {
    return;
  }

  authStateInitialized = true;
  
  // Create a promise that resolves when auth state is first checked
  authStateReadyPromise = new Promise((resolve) => {
    authStateReadyResolve = resolve;
  });
  
  const auth = getFirebaseAuth();

  onAuthStateChanged(auth, async (firebaseUser) => {
    if (suppressAuthStateHandling) {
      logger.log('Auth state change suppressed temporarily (registration/reactivation flow)');
      // Ensure any waiter for initial auth state doesn't hang.
      if (authStateReadyResolve) {
        authStateReadyResolve();
        authStateReadyResolve = null;
      }
      return;
    }
    if (!firebaseUser) {
      currentUserCache = null;
      notifyAuthListeners(null);
      unsubscribeAllListeners(); // Clean up listeners on sign-out
      // Resolve the ready promise even if no user
      if (authStateReadyResolve) {
        authStateReadyResolve();
        authStateReadyResolve = null;
      }
      return;
    }

    try {
      // Ensure we have a valid token
      try {
        await firebaseUser.getIdToken(true);
      } catch (tokenError) {
        logger.error('Token refresh failed in auth listener:', tokenError);
        currentUserCache = null;
        notifyAuthListeners(null);
        unsubscribeAllListeners(); // Clean up listeners on sign-out
        if (authStateReadyResolve) {
          authStateReadyResolve();
          authStateReadyResolve = null;
        }
        return;
      }
      
      const record = await ensureUserRecordFromAuth(firebaseUser);
      const user = toUser(firebaseUser.uid, record);

      if (user.status !== 'approved') {
        currentUserCache = null;
        notifyAuthListeners(null);
        unsubscribeAllListeners(); // Clean up listeners for non-approved users
      } else {
        currentUserCache = user;
        notifyAuthListeners(user);
      }
    } catch (error) {
      logger.error('Auth state listener error:', error);
      currentUserCache = null;
      notifyAuthListeners(null);
      unsubscribeAllListeners(); // Clean up listeners on error
    } finally {
      // Resolve the ready promise after first auth check
      if (authStateReadyResolve) {
        authStateReadyResolve();
        authStateReadyResolve = null;
      }
    }
  });
};

/**
 * Maps Firebase Authentication error codes to user-friendly messages.
 * 
 * @param error - Firebase auth error object
 * @returns User-friendly error message
 */
const mapAuthErrorToMessage = (error: { code?: string }): string => {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'The provided email address is invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/requires-recent-login':
      return 'Please sign in again before updating your password.';
    default:
      return 'An authentication error occurred.';
  }
};

/**
 * Authentication service providing user authentication and registration.
 * 
 * Handles:
 * - Faculty registration and signup requests
 * - User login and logout
 * - Password reset and account recovery
 * - Auth state monitoring
 * - Account reactivation for previously rejected users
 */
export const authService = {
  async handleRejectedUserReactivation(
    email: string,
    password: string,
    name: string,
    department: string,
    recaptchaToken?: string
  ): Promise<{ request: SignupRequest }> {
    // If a user's signup was rejected, their Auth account was likely deleted.
    // In this case, reactivation is the same as a new registration.
    // We can check if the user exists by trying to fetch them by email.
    // If they don't exist, we just call the normal registration flow.
    const existingUser = await userService.getByEmail(email);
    if (!existingUser) {
      logger.log(`Reactivation attempt for non-existent user ${email}. Treating as new registration.`);
      // The user was fully deleted, so this is a new registration.
      return this.registerFaculty(email, password, name, department, undefined, recaptchaToken);
    }

    // Try to sign in first to get the existing Firebase Auth user
    ensureAuthStateListener();
    const auth = getFirebaseAuth();
    // Suppress auth state handling while we programmatically sign in and recreate records
    suppressAuthStateHandling = true;
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;

      // Update profile
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name }).catch(() => undefined);
      }

      // Recreate user record
      const record = await ensureUserRecordFromAuth(firebaseUser, {
        email,
        name,
        department,
        role: 'faculty',
        status: 'pending',
      });

      const database = getDb();
      const now = nowIso();

      const requestRecord: FirestoreSignupRequestRecord = {
        uid: firebaseUser.uid,
        email: record.email,
        emailLower: record.emailLower,
        name: record.name,
        department,
        status: 'pending',
        requestDate: now,
        createdAt: now,
        updatedAt: now,
        ...(recaptchaToken && { recaptchaToken }), // Store token if provided
      };

      await setDoc(doc(database, COLLECTIONS.SIGNUP_REQUESTS, firebaseUser.uid), requestRecord);

      // Notify admins about the new signup request using the server callable for consistency and permissions
      try {
        const app = getFirebaseApp();
        const functions = getFunctions(app, 'us-central1');
        const fn = httpsCallable(functions, 'notifyAdminsOfNewSignup');
        await withRetry(() => fn({ requestId: firebaseUser.uid, name: record.name, email: record.email }), { attempts: 3, shouldRetry: isNetworkError });
      } catch (err) {
        logger.warn('Failed to notify admins of new signup:', err);
      }

      // Email verification disabled - not required for this system
      // await sendEmailVerification(firebaseUser).catch(() => undefined);

      return { request: toSignupRequest(firebaseUser.uid, requestRecord) };
    } finally {
      // Always clear suppression and sign out the programmatic session
      suppressAuthStateHandling = false;
      await firebaseSignOut(auth).catch(() => undefined);
      currentUserCache = null;
      notifyAuthListeners(null);
    }
  },

  async registerFaculty(
    email: string,
    password: string,
    name: string,
    department: string,
    departments?: string[],
    recaptchaToken?: string
  ): Promise<{ request: SignupRequest }> {
    ensureAuthStateListener();
    const auth = getFirebaseAuth();

    // Use departments array if provided, otherwise fallback to single department
    const depts = departments && departments.length > 0 ? departments : [department];

    // Suppress auth state handling to avoid racing the global listener
    suppressAuthStateHandling = true;
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    try {
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name }).catch(() => undefined);
      }

      const record = await ensureUserRecordFromAuth(firebaseUser, {
        email,
        name,
        department: depts[0], // Primary department for backward compatibility
        departments: depts,
        role: 'faculty',
        status: 'pending',
      });

      const database = getDb();
      const now = nowIso();

      const requestRecord: FirestoreSignupRequestRecord = {
        uid: firebaseUser.uid,
        email: record.email,
        emailLower: record.emailLower,
        name: record.name,
        department: depts[0], // Primary department for backward compatibility
        departments: depts,
        status: 'pending',
        requestDate: now,
        createdAt: now,
        updatedAt: now,
        ...(recaptchaToken && { recaptchaToken }), // Store token if provided
      };

      await setDoc(doc(database, COLLECTIONS.SIGNUP_REQUESTS, firebaseUser.uid), requestRecord);

      // Notify admins about the new signup request using the server callable for consistency and permissions
      // (wrap in try/catch to avoid failing the signup flow if the callable is temporarily unreachable)
      try {
        const app = getFirebaseApp();
        const functions = getFunctions(app, 'us-central1');
        const fn = httpsCallable(functions, 'notifyAdminsOfNewSignup');
        await withRetry(() => fn({ requestId: firebaseUser.uid, name: record.name, email: record.email }), { attempts: 3, shouldRetry: isNetworkError });
      } catch (err) {
        logger.warn('Failed to notify admins of new signup:', err);
      }

      // Email verification disabled - not required for this system
      // await sendEmailVerification(firebaseUser).catch(() => undefined);

      return { request: toSignupRequest(firebaseUser.uid, requestRecord) };
    } catch (error) {
      // If Firestore operations fail, delete the Auth user to prevent orphaned accounts
      logger.error('Signup failed, cleaning up Auth user:', error);
      try {
        await firebaseUser.delete();
        logger.log('Auth user deleted successfully');
      } catch (deleteError) {
        logger.error('Failed to delete Auth user:', deleteError);
      }
      throw error;
    } finally {
      // Clear suppression and sign out the programmatic session
      suppressAuthStateHandling = false;
      await firebaseSignOut(auth).catch(() => undefined);
      currentUserCache = null;
      notifyAuthListeners(null);
    }
  },

  async signIn(email: string, password: string): Promise<User | null> {
    ensureAuthStateListener();
    const auth = getFirebaseAuth();
    const database = getDb();
    const functions = getFunctions(getFirebaseApp(), 'us-central1');

    try {
      // Attempt to sign in with Firebase Authentication first
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;
      
      // Force token refresh to ensure we have a valid token
      try {
        await firebaseUser.getIdToken(true);
      } catch (tokenError) {
        logger.warn('Failed to refresh token on sign in:', tokenError);
      }
      
      const record = await ensureUserRecordFromAuth(firebaseUser);
      const user = toUser(firebaseUser.uid, record);

      // Check if account is locked (after authentication but before allowing login)
      if (user.accountLocked) {
        const now = new Date();

        // If locked by admin, prevent login until an admin explicitly unlocks
        if (user.lockedByAdmin) {
          await firebaseSignOut(auth);
          currentUserCache = null;
          notifyAuthListeners(null);
          throw new Error('Your account has been disabled by an administrator. Please contact your administrator to re-enable this account.');
        }

        // Otherwise, treat it as a system lockout (time-bound)
        if (user.lockedUntil) {
          const lockedUntilDate = new Date(user.lockedUntil);
          if (now < lockedUntilDate) {
            // Account is still locked - sign them out
            await firebaseSignOut(auth);
            currentUserCache = null;
            notifyAuthListeners(null);

            const minutesRemaining = Math.ceil((lockedUntilDate.getTime() - now.getTime()) / 60000);
            throw new Error(`Account is locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`);
          } else {
            // Lockout period has expired, will be unlocked below in success handler
          }
        }
      }

      if (user.status !== 'approved') {
        await firebaseSignOut(auth);
        currentUserCache = null;
        notifyAuthListeners(null);
        unsubscribeAllListeners();
        throw new AuthStatusError(
          user.status,
          user.status === 'pending'
            ? 'Your account is awaiting administrator approval.'
            : 'Your account was rejected. Please contact the administrator.'
        );
      }

      // Success! Call Cloud Function to reset failed login attempts (with retries)
      try {
        const resetFailedLogins = httpsCallable(functions, 'resetFailedLogins');
        await withRetry(() => resetFailedLogins(), { attempts: 3, shouldRetry: isNetworkError });
        logger.log('✅ Failed login attempts reset');
      } catch (cloudFunctionError) {
        logger.warn('⚠️ Failed to call resetFailedLogins cloud function after retries:', cloudFunctionError);
        // Don't fail login if cloud function fails - try to update directly as fallback
        try {
          const userDocRef = doc(database, COLLECTIONS.USERS, firebaseUser.uid);
          await updateDoc(userDocRef, {
            failedLoginAttempts: 0,
            accountLocked: false,
            lockedUntil: null,
            lastSignInAt: nowIso(),
            updatedAt: nowIso(),
          });
        } catch (fallbackError) {
          logger.error('Failed to reset login attempts (fallback):', fallbackError);
        }
      }

      currentUserCache = user;
      notifyAuthListeners(user);
      return user;
    } catch (error) {
      if (error instanceof AuthStatusError) {
        throw error;
      }

      // Handle failed login attempts - call Cloud Function to track
      // Log the error to see what we're getting
      logger.log('🔍 Login error details:', {
        error,
        code: error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : 'no-code',
        message: error instanceof Error ? error.message : 'unknown'
      });

      // Check if this is an admin-locked account error (not a failed login attempt)
      const errorMessage = error instanceof Error ? error.message : '';
      const isAdminLocked = errorMessage.includes('disabled by an administrator') || 
                           errorMessage.includes('Account locked') ||
                           errorMessage.includes('locked by admin');

      // Only track failed login attempts for actual authentication errors,
      // NOT for accounts that are already locked by admin
      if (!isAdminLocked && error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        
        // Track any auth-related error
        if (code?.startsWith('auth/')) {
          logger.log('🔒 Calling trackFailedLogin for:', email);

          // Optimisation: do the tracking call in the background so we can
          // return control to the UI immediately. In some environments the
          // callable or network retries can take a long time which blocks the
          // sign-in error propagation and delays any UI reaction (such as
          // opening the account-locked modal). We set a lightweight
          // sessionStorage placeholder so the UI can open a modal immediately
          // and update it when the callable returns.
          try {
            try { sessionStorage.setItem('accountLocked', 'true'); } catch (_) {}
            try { sessionStorage.setItem('accountLockedMessage', 'Checking account status...'); } catch (_) {}
            try { sessionStorage.setItem('accountLockReason', 'failed_attempts'); } catch (_) {}
          } catch (_) {}

          // Fire-and-forget the callable. Update sessionStorage when the
          // callable completes so the UI can show the server-provided message.
          (async () => {
            try {
              const trackFailedLoginFn = httpsCallable(functions, 'trackFailedLogin');
              const result = await withRetry(() => trackFailedLoginFn({ email }), { attempts: 3, shouldRetry: isNetworkError });
              const data = result.data as {
                locked?: boolean;
                attemptsRemaining?: number;
                message?: string;
                lockedUntil?: string;
              };

              logger.log('✅ trackFailedLogin response (background):', data);

              if (data.message) {
                try { sessionStorage.setItem('accountLockedMessage', data.message); } catch (_) {}
              }

              if (data.locked) {
                // If the server explicitly locked the account, keep the flag
                // and set the message. The UI will already have opened the
                // modal because we set the sessionStorage above.
                try { sessionStorage.setItem('accountLocked', 'true'); } catch (_) {}
              } else {
                // If not locked, remove the placeholder flag so UI can clear
                // the modal if desired.
                try { sessionStorage.removeItem('accountLocked'); } catch (_) {}
                try { sessionStorage.removeItem('accountLockedMessage'); } catch (_) {}
              }
            } catch (bgErr) {
              logger.error('❌ trackFailedLogin background error:', bgErr);
            }
          })();
        }
      }
      
      // Throw a more specific error if it's an account lock situation
      if (error instanceof Error && (error.message.includes('Account locked') || error.message.includes('attempts remaining') || error.message.includes('disabled by an administrator'))) {
        throw error;
      }

      throw new Error('Invalid credentials. Please check your email and password.');
    }
  },

  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth).catch(() => undefined);
    currentUserCache = null;
    notifyAuthListeners(null);
    unsubscribeAllListeners();
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const auth = getFirebaseAuth();

    try {
      // Validate email format first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { 
          success: false, 
          message: 'Please enter a valid email address.' 
        };
      }

      // Note: Firebase Authentication will send password reset emails to any email address
      // as a security feature (to prevent email enumeration attacks).
      // This means even non-existent emails will receive a message saying "no account found".
      // We cannot prevent this behavior without a backend/Cloud Function.
      await sendPasswordResetEmail(auth, email);
      
      return { 
        success: true, 
        message: 'Password reset instructions sent. If an account exists with this email, you will receive a link shortly.' 
      };
    } catch (error) {
      logger.error('Password reset error:', error);
      
      // Handle specific Firebase errors
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        
        switch (code) {
          case 'auth/invalid-email':
            return { 
              success: false, 
              message: 'Please enter a valid email address.' 
            };
          case 'auth/too-many-requests':
            return { 
              success: false, 
              message: 'Too many reset attempts. Please try again later.' 
            };
          case 'auth/missing-email':
            return { 
              success: false, 
              message: 'Please enter an email address.' 
            };
          default:
            // For any other error, show a generic message
            return { 
              success: false, 
              message: 'Unable to process request. Please try again or contact support.' 
            };
        }
      }
      
      return { 
        success: false, 
        message: 'An unexpected error occurred. Please try again.' 
      };
    }
  },

  async confirmPasswordReset(actionCode: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const auth = getFirebaseAuth();
    try {
      await firebaseConfirmPasswordReset(auth, actionCode, newPassword);
      return { 
        success: true, 
        message: 'Password has been reset successfully. You can now log in with your new password.' 
      };
    } catch (error) {
      const typedError = error as { code?: string };
      let message = 'Failed to reset password. The link may be invalid or expired.';
      if (typedError.code === 'auth/invalid-action-code') {
        message = 'The password reset link is invalid or has expired. Please request a new one.';
      } else if (typedError.code === 'auth/weak-password') {
        message = 'The new password is too weak. Please choose a stronger password.';
      }
      logger.error('Confirm password reset error:', error);
      return { success: false, message };
    }
  },

  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string; requiresSignOut?: boolean }> {
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, message: 'No authenticated user found or user has no email.' };
    }

    try {
      // Re-authenticate the user first
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);

      // Now, update the password
      await firebaseUpdatePassword(firebaseUser, newPassword);
      
      // Sign out to invalidate all sessions
      await firebaseSignOut(auth).catch(() => undefined);
      currentUserCache = null;
      notifyAuthListeners(null);
      unsubscribeAllListeners();
      
      return { 
        success: true, 
        message: 'Password updated successfully. You have been logged out for security.', 
        requiresSignOut: true 
      };
    } catch (error) {
      const typedError = error as { code?: string };
      if (typedError.code === 'auth/wrong-password' || typedError.code === 'auth/invalid-credential') {
        return { success: false, message: 'The current password you entered is incorrect.' };
      }
      const message = mapAuthErrorToMessage(typedError);
      return { success: false, message };
    }
  },

  async getCurrentUser(): Promise<User | null> {
    ensureAuthStateListener();

    // Wait for auth state to be initialized
    if (authStateReadyPromise) {
      await authStateReadyPromise;
    }

    if (currentUserCache) {
      return currentUserCache;
    }

    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      return null;
    }

    try {
      // Refresh the token to ensure it's valid
      try {
        await firebaseUser.getIdToken(true);
      } catch (tokenError) {
        logger.warn('Failed to refresh token:', tokenError);
        // If token refresh fails, user might need to re-authenticate
        await firebaseSignOut(auth);
        currentUserCache = null;
        notifyAuthListeners(null);
        unsubscribeAllListeners();
        return null;
      }
      
      const record = await ensureUserRecordFromAuth(firebaseUser);
      const user = toUser(firebaseUser.uid, record);

      if (user.status !== 'approved') {
        await firebaseSignOut(auth);
        currentUserCache = null;
        notifyAuthListeners(null);
        unsubscribeAllListeners();
        return null;
      }

      currentUserCache = user;
      return user;
    } catch (error) {
      logger.error('Failed to fetch current user:', error);
      // Clear auth state on error
      await firebaseSignOut(auth).catch(() => undefined);
      currentUserCache = null;
      notifyAuthListeners(null);
      unsubscribeAllListeners();
      return null;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const user = await authService.getCurrentUser();
    return Boolean(user);
  },

  onAuthStateChange(
    callback: (user: User | null) => void,
    errorCallback?: (error: string) => void
  ) {
    ensureAuthStateListener();
    authListeners.add(callback);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            try {
              authListeners.delete(callback);
            } catch (error) {
              logger.error('Failed to remove auth listener', error);
              errorCallback?.('Failed to unsubscribe from auth updates');
            }
          },
        },
      },
    };
  },

  async signOutDueToIdleTimeout(): Promise<void> {
    logger.log('🕒 User session expired due to inactivity - logging out');
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth).catch(() => undefined);
    currentUserCache = null;
    notifyAuthListeners(null);
    unsubscribeAllListeners();
  },
};

// ============================================
// USER SERVICE
// ============================================

/**
 * User service for managing user accounts and profiles.
 * 
 * Provides operations for:
 * - Retrieving user data
 * - Updating user profiles
 * - Managing user roles and status
 * - Account locking/unlocking
 * - Push notification preferences
 * - Real-time user data subscriptions
 */
export const userService = {
  async getAll(): Promise<User[]> {
    const database = getDb();
    const usersRef = collection(database, COLLECTIONS.USERS);
    const q = query(usersRef, orderBy('name'));
      const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });
    return snapshot.docs.map((docSnapshot) => {
      const record = ensureUserData(docSnapshot);
      return toUser(docSnapshot.id, record);
    });
  },

  async getByEmail(email: string): Promise<User | null> {
    const userEntry = await fetchUserDocByEmail(email);
    if (!userEntry) {
      return null;
    }
    return toUser(userEntry.id, userEntry.record);
  },

  async getById(id: string): Promise<User | null> {
    return fetchUserById(id);
  },

  async update(
    id: string,
    updates: Partial<User> & { status?: FirestoreUserRecord['status'] }
  ): Promise<User> {
    const database = getDb();
    const userRef = doc(database, COLLECTIONS.USERS, id);

    const payload: Partial<FirestoreUserRecord> = {
      updatedAt: nowIso(),
    };

    if (typeof updates.email === 'string') {
      payload.email = updates.email;
      payload.emailLower = updates.email.toLowerCase();
    }

    if (typeof updates.name === 'string') {
      payload.name = updates.name;
    }

    if (typeof updates.role === 'string') {
      payload.role = updates.role as UserRole;
    }

    if (updates.department !== undefined) {
      payload.department = updates.department;
    }

    if ((updates as any).departments !== undefined) {
      payload.departments = (updates as any).departments;
    }

    if (typeof (updates as any).pushEnabled === 'boolean') {
      payload.pushEnabled = (updates as any).pushEnabled;
    }

    if (updates.status) {
      payload.status = updates.status;
    }

    const sanitized = sanitizeUserUpdate(payload);
    if (Object.keys(sanitized).length > 0) {
      await updateDoc(userRef, sanitized);
    }

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    const record = ensureUserData(snapshot);
    const user = toUser(snapshot.id, record);

    if (currentUserCache?.id === id && user.status === 'approved') {
      currentUserCache = user;
      notifyAuthListeners(user);
    }

    return user;
  },

  async updateStatus(
    id: string,
    status: FirestoreUserRecord['status'],
    overrides: Partial<User> = {}
  ): Promise<User> {
    return userService.update(id, { ...overrides, status });
  },

  async unlockAccount(id: string): Promise<User> {
    const database = getDb();
    const userRef = doc(database, COLLECTIONS.USERS, id);

    // First update Firestore directly
    await updateDoc(userRef, {
      failedLoginAttempts: 0,
      accountLocked: false,
      lockedUntil: null,
      lockedByAdmin: false,
      updatedAt: nowIso(),
    });

    // Then call the Cloud Function to also clear the brute force protection lock
    // This ensures both the Firestore lock AND the Cloud Function tracking are cleared
    try {
      const functions = getFunctions();
      const adminResetFailedLogins = httpsCallable(functions, 'adminResetFailedLogins');
      await adminResetFailedLogins({ userId: id });
      logger.log('Successfully cleared Cloud Function brute force protection for user:', id);
    } catch (err) {
      // Log the error but don't fail the unlock - Firestore lock is already cleared
      logger.warn('Failed to clear Cloud Function brute force protection (Firestore lock already cleared):', err);
    }

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    const record = ensureUserData(snapshot);
    return toUser(snapshot.id, record);
  },
  
  async lockAccount(id: string, minutes = 30): Promise<User> {
    const database = getDb();
    const userRef = doc(database, COLLECTIONS.USERS, id);
    
    // Check if user is an admin - NEVER lock admin accounts
    const checkSnapshot = await getDoc(userRef);
    if (!checkSnapshot.exists()) {
      throw new Error('User not found');
    }
    const userData = ensureUserData(checkSnapshot);
    if (userData.role === 'admin') {
      throw new Error('Cannot lock admin accounts');
    }
    
    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    await updateDoc(userRef, {
      accountLocked: true,
      lockedUntil,
      lockedByAdmin: false,
      updatedAt: nowIso(),
    });

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    const record = ensureUserData(snapshot);
    // Attempt to revoke refresh tokens for the user so currently-signed-in sessions are invalidated.
    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'revokeUserTokens');
      // best-effort: do not fail the lock operation if the callable is unavailable
      const resp = await withRetry(() => fn({ userId: id, reason: `Locked by admin via client` }), { attempts: 3, shouldRetry: isNetworkError });
      logger.log('revokeUserTokens response:', resp?.data);
    } catch (revErr) {
      // Log but don't throw - lock state was already set in Firestore
      logger.warn('Failed to call revokeUserTokens callable after locking account:', revErr);
    }
    return toUser(snapshot.id, record);
  },

  // Admin-triggered account disable: mark as locked by admin and do NOT set a timed lockedUntil.
  // This prevents auto-unlock behavior; an admin must explicitly call unlockAccount to re-enable.
  async lockAccountByAdmin(id: string): Promise<User> {
    const database = getDb();
    const userRef = doc(database, COLLECTIONS.USERS, id);

    // Check if user is an admin - NEVER lock admin accounts
    const checkSnapshot = await getDoc(userRef);
    if (!checkSnapshot.exists()) {
      throw new Error('User not found');
    }
    const userData = ensureUserData(checkSnapshot);
    if (userData.role === 'admin') {
      throw new Error('Cannot lock admin accounts');
    }

    await updateDoc(userRef, {
      accountLocked: true,
      lockedUntil: null,
      lockedByAdmin: true,
      updatedAt: nowIso(),
    });

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    const record = ensureUserData(snapshot);
    // Attempt to revoke refresh tokens for the user so currently-signed-in sessions are invalidated.
    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'revokeUserTokens');
      // best-effort: do not fail the lock operation if the callable is unavailable
      const resp = await withRetry(() => fn({ userId: id, reason: `Locked by admin via client` }), { attempts: 3, shouldRetry: isNetworkError });
      logger.log('revokeUserTokens response:', resp?.data);
    } catch (revErr) {
      // Log but don't throw - lock state was already set in Firestore
      logger.warn('Failed to call revokeUserTokens callable after locking account (admin):', revErr);
    }

    return toUser(snapshot.id, record);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const userRef = doc(database, COLLECTIONS.USERS, id);
    await deleteDoc(userRef);
    if (currentUserCache?.id === id) {
      await authService.signOut();
    }
  },
};

// ============================================
// CLASSROOM SERVICE
// ============================================

/**
 * Classroom service for managing classroom resources.
 * 
 * Provides operations for:
 * - Creating, updating, and deleting classrooms
 * - Retrieving classroom availability
 * - Searching and filtering classrooms
 * - Managing classroom equipment and capacity
 * - Real-time classroom data subscriptions
 */
export const classroomService = {
  async getAll(): Promise<Classroom[]> {
    const database = getDb();
    const classroomsRef = collection(database, COLLECTIONS.CLASSROOMS);
    const q = query(classroomsRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreClassroomRecord;
      return toClassroom(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<Classroom | null> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.CLASSROOMS, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as FirestoreClassroomRecord;
    return toClassroom(snapshot.id, data);
  },

  async create(classroom: Omit<Classroom, 'id'>): Promise<Classroom> {
    const database = getDb();
    const record: FirestoreClassroomRecord = {
      ...classroom,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const ref = await addDoc(collection(database, COLLECTIONS.CLASSROOMS), record);
    return toClassroom(ref.id, record);
  },

  async update(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.CLASSROOMS, id);
    
    // Filter out undefined values to prevent Firebase errors
    const cleanedUpdates = removeUndefinedValues(updates);
    
    const updatePayload: Partial<FirestoreClassroomRecord> = {
      ...cleanedUpdates,
      updatedAt: nowIso(),
    };
    await updateDoc(ref, updatePayload as Record<string, unknown>);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Classroom not found');
    }
    const data = snapshot.data() as FirestoreClassroomRecord;
    return toClassroom(snapshot.id, data);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.CLASSROOMS, id);

    // Before deleting the classroom, delete related booking requests and schedules
    // but keep ones that already lapsed (i.e., their end time is in the past).
    try {
      // Helper to chunk write batches (max 500 ops per batch)
    const chunkAndCommit = async (docsToDelete: DocumentReference[] | any[]) => {
        // We'll build batches of up to 450 to be safe
        const CHUNK_SIZE = 450;
        for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
          const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
          // Use the Firestore write batch helper exposed from the Firestore instance if available
          const dbInst = getDb();
          // Minimal typed batch shape we need
          type MinimalBatch = { delete: (ref: DocumentReference) => void; commit: () => Promise<void> };
          const maybeBatch = (dbInst as unknown as { batch?: () => MinimalBatch }).batch?.();
          // Use low-level write batch if available
          if (maybeBatch) {
            chunk.forEach((d: DocumentReference) => maybeBatch.delete(d));
            await maybeBatch.commit();
          } else {
            // Fallback: delete sequentially
            for (const d of chunk) {
              await deleteDoc(d);
            }
          }
        }
      };

      // Collect booking requests for this classroom
      const bookingRef = collection(database, COLLECTIONS.BOOKING_REQUESTS);
      const bookingQ = query(bookingRef, where('classroomId', '==', id));
      const bookingSnap = await getDocs(bookingQ);

      const bookingDeletes: ReturnType<typeof doc>[] = [];
      for (const bs of bookingSnap.docs) {
        const data = bs.data() as FirestoreBookingRequestRecord;
        // Consider a booking lapsed if its endTime is in the past for the given date
        const lapsed = isPastBookingTime(data.date, data.endTime);
        if (!lapsed) {
          bookingDeletes.push(doc(database, COLLECTIONS.BOOKING_REQUESTS, bs.id));
        }
      }

      // Collect schedules for this classroom
      const scheduleRef = collection(database, COLLECTIONS.SCHEDULES);
      const scheduleQ = query(scheduleRef, where('classroomId', '==', id));
      const scheduleSnap = await getDocs(scheduleQ);

      const scheduleDeletes: ReturnType<typeof doc>[] = [];
      for (const ss of scheduleSnap.docs) {
        const data = ss.data() as FirestoreScheduleRecord;
        const lapsed = isPastBookingTime(data.date, data.endTime);
        if (!lapsed) {
          scheduleDeletes.push(doc(database, COLLECTIONS.SCHEDULES, ss.id));
        }
      }

      // Commit deletions in chunks
      if (bookingDeletes.length > 0) {
        // convert to DocumentReference array
        await chunkAndCommit(bookingDeletes);
        logger.log(`Deleted ${bookingDeletes.length} related booking request(s) for classroom ${id}`);
      }

      if (scheduleDeletes.length > 0) {
        await chunkAndCommit(scheduleDeletes);
        logger.log(`Deleted ${scheduleDeletes.length} related schedule(s) for classroom ${id}`);
      }
    } catch (cascadeError) {
      logger.error('Error during cascade deletion for classroom:', cascadeError);
      // proceed to still delete classroom document even if cascade had issues
    }

    await deleteDoc(ref);
  },

  // Call server-side cascade delete (admin-only). Returns deleted related count.
  async deleteCascade(id: string): Promise<{ success: boolean; deletedRelated: number }> {
    const app = getFirebaseApp();
    const functions = getFunctions(app, 'us-central1');
    const deleteClassroomCascade = httpsCallable(functions, 'deleteClassroomCascade');
    const result = await withRetry(() => deleteClassroomCascade({ classroomId: id }), { attempts: 3, shouldRetry: isNetworkError });
    return result.data as { success: boolean; deletedRelated: number };
  },
};

// ============================================
// BOOKING REQUEST SERVICE
// ============================================

/**
 * Helper function to check if two time ranges overlap.
 * 
 * @param startA - Start time of range A
 * @param endA - End time of range A
 * @param startB - Start time of range B
 * @param endB - End time of range B
 * @returns true if the time ranges overlap
 */
const timesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) =>
  (startA >= startB && startA < endB) ||
  (endA > startB && endA <= endB) ||
  (startA <= startB && endA >= endB);

/**
 * Booking request service for managing classroom booking requests.
 * 
 * Provides operations for:
 * - Creating and submitting booking requests
 * - Approving or rejecting requests (admin)
 * - Canceling pending requests
 * - Retrieving booking history
 * - Checking classroom availability
 * - Real-time booking request subscriptions
 */
export const bookingRequestService = {
  async getAll(): Promise<BookingRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.BOOKING_REQUESTS);
  const q = query(ref, orderBy('requestDate', 'desc'));
  const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreBookingRequestRecord;
      return toBookingRequest(docSnapshot.id, data);
    });
  },

  async getAllForFaculty(facultyId: string): Promise<BookingRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.BOOKING_REQUESTS);
  const q = query(ref, where('facultyId', '==', facultyId), orderBy('requestDate', 'desc'));
  const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreBookingRequestRecord;
      return toBookingRequest(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<BookingRequest | null> {
    const database = getDb();
  const ref = doc(database, COLLECTIONS.BOOKING_REQUESTS, id);
  const snapshot = await withRetry(() => getDoc(ref), { attempts: 3, shouldRetry: isNetworkError });
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as FirestoreBookingRequestRecord;
    return toBookingRequest(snapshot.id, data);
  },

  async create(
    request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>
  ): Promise<BookingRequest> {
    const database = getDb();
    const record: FirestoreBookingRequestRecord = {
      ...request,
      status: 'pending',
      requestDate: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const ref = await addDoc(collection(database, COLLECTIONS.BOOKING_REQUESTS), record);
    // Notify admins about the new request using the server callable for consistency and permissions
    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'notifyAdminsOfNewRequest');
      await withRetry(() => fn({
        bookingRequestId: ref.id,
        facultyId: record.facultyId,
        facultyName: record.facultyName,
        classroomName: record.classroomName,
        date: record.date,
        startTime: record.startTime,
        endTime: record.endTime,
        purpose: record.purpose,
      }), { attempts: 3, shouldRetry: isNetworkError });
    } catch (err) {
      logger.warn('Failed to notify admins of new booking request:', err);
    }
    return toBookingRequest(ref.id, record);
  },

  async update(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.BOOKING_REQUESTS, id);
    
    // Filter out undefined values to prevent Firebase errors
    const cleanedUpdates = removeUndefinedValues(updates);
    
    const updatePayload: Partial<FirestoreBookingRequestRecord> = {
      ...cleanedUpdates,
      updatedAt: nowIso(),
      // Mark who performed this update so server-side triggers can avoid notifying the actor
      updatedBy: currentUserCache?.id ?? null,
    };
    await updateDoc(ref, updatePayload as Record<string, unknown>);

    // After updating, load the snapshot and optionally create a notification
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Booking request not found');
    }
    const data = snapshot.data() as FirestoreBookingRequestRecord;

    // If status changed to approved, rejected, or cancelled, create a notification for the faculty
    if (
      updatePayload.status === 'approved' ||
      updatePayload.status === 'rejected' ||
      updatePayload.status === 'cancelled'
    ) {
      try {
        // Cast to NotificationType compatible union; notificationService accepts 'cancelled' now
        const notifType = (updatePayload.status as 'approved' | 'rejected' | 'cancelled');
        const verb = notifType === 'cancelled' ? 'cancelled' : `was ${notifType}`;
        const message =
          notifType === 'cancelled'
            ? `Your approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime} was cancelled.`
            : `Your booking request for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime} ${verb}.`;

        await notificationService.createNotification(
          data.facultyId,
          notifType,
          message,
          { bookingRequestId: snapshot.id, adminFeedback: updatePayload.adminFeedback, actorId: currentUserCache?.id }
        );
      } catch (err) {
        logger.warn('Could not create notification after booking update:', err);
      }
    }

    return toBookingRequest(snapshot.id, data);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.BOOKING_REQUESTS, id);
    await deleteDoc(ref);
  },

  // Fallback: call server-side callable to cancel a booking request when client-side delete is blocked by rules
  async cancelWithCallable(id: string): Promise<void> {
    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
      const fn = httpsCallable(functions, 'cancelBookingRequest');
      await withRetry(() => fn({ bookingRequestId: id }), { attempts: 3, shouldRetry: isNetworkError });
    } catch (err) {
      // Re-throw so callers can handle errors
      throw err;
    }
  },

  async checkConflicts(
    classroomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeRequestId?: string
  ): Promise<boolean> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.BOOKING_REQUESTS);

    // Query for requests for the same classroom and date
    const q = query(
      ref,
      where('classroomId', '==', classroomId),
      where('date', '==', date),
      where('status', 'in', ['pending', 'approved'])
    );

    const snapshot = await getDocs(q);
    const conflictingRequests = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as BookingRequest))
      .filter(req => req.id !== excludeRequestId);

    for (const req of conflictingRequests) {
      if (doTimeRangesOverlap(startTime, endTime, req.startTime, req.endTime)) {
        return true; // Found a conflict
      }
    }

    return false; // No conflicts found
  },

  // Bulk update multiple booking requests atomically using a write batch.
  // Each update entry should contain the document id and a partial data object.
  async bulkUpdate(updates: Array<{ id: string; data: Partial<BookingRequest> }>): Promise<void> {
    const payloads = updates.map(u => ({ id: u.id, data: u.data as Record<string, unknown> }));
  // Add updatedBy to each update to mark the actor
  const payloadsWithActor = payloads.map(p => ({ id: p.id, data: { ...p.data, updatedAt: nowIso(), updatedBy: currentUserCache?.id ?? null } }));
  await bulkUpdateDocs(COLLECTIONS.BOOKING_REQUESTS, payloadsWithActor);

    // After the batch commit, create notifications for any requests whose
    // status was changed to approved, rejected, or cancelled. We fetch the
    // latest document state to construct a friendly message.
    try {
      for (const u of updates) {
        const status = (u.data as Partial<BookingRequest>).status as BookingRequest['status'] | undefined;
        if (!status) continue;
        if (status !== 'approved' && status !== 'rejected' && status !== 'cancelled') continue;

        const db = getDb();
        const ref = doc(db, COLLECTIONS.BOOKING_REQUESTS, u.id);
        const snapshot = await getDoc(ref);
        if (!snapshot.exists()) continue;
        const data = snapshot.data() as FirestoreBookingRequestRecord;

        const notifType = status === 'cancelled' ? 'cancelled' : (status === 'approved' ? 'approved' : 'rejected');
        const verb = notifType === 'cancelled' ? 'was cancelled' : `was ${notifType}`;
        const message =
          notifType === 'cancelled'
            ? `Your approved reservation for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime} was cancelled.`
            : `Your booking request for ${data.classroomName} on ${data.date} ${data.startTime}-${data.endTime} ${verb}.`;

        try {
          await notificationService.createNotification(
            data.facultyId,
            notifType as any,
            message,
            { bookingRequestId: snapshot.id, adminFeedback: (u.data as any).adminFeedback, actorId: currentUserCache?.id }
          );
        } catch (err) {
          logger.warn('Failed to create notification after bulk booking update for', u.id, err);
        }
      }
    } catch (err) {
      logger.warn('Error while post-processing bulk booking updates for notifications:', err);
    }
  },
};

function doTimeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
) {
  return (
    (startA >= startB && startA < endB) ||
    (endA > startB && endA <= endB) ||
    (startA <= startB && endA >= endB)
  );
}

// ============================================
// SCHEDULE SERVICE
// ============================================

/**
 * Schedule service for managing approved classroom bookings.
 * 
 * Schedules represent confirmed classroom reservations.
 * Provides operations for:
 * - Retrieving all schedules
 * - Filtering schedules by faculty or classroom
 * - Getting schedules for specific date ranges
 * - Real-time schedule subscriptions
 */
export const scheduleService = {
  async getAll(): Promise<Schedule[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SCHEDULES);
    const q = query(ref, orderBy('date'), orderBy('startTime'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreScheduleRecord;
      return toSchedule(docSnapshot.id, data);
    });
  },

  async getAllForFaculty(facultyId: string): Promise<Schedule[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SCHEDULES);
    const q = query(ref, where('facultyId', '==', facultyId), orderBy('date'), orderBy('startTime'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreScheduleRecord;
      return toSchedule(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<Schedule | null> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SCHEDULES, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as FirestoreScheduleRecord;
    return toSchedule(snapshot.id, data);
  },

  async create(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const database = getDb();
    const record: FirestoreScheduleRecord = {
      ...schedule,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const ref = await addDoc(collection(database, COLLECTIONS.SCHEDULES), record);
    return toSchedule(ref.id, record);
  },

  async update(id: string, updates: Partial<Schedule>): Promise<Schedule> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SCHEDULES, id);
    
    // Filter out undefined values to prevent Firebase errors
    const cleanedUpdates = removeUndefinedValues(updates);
    
    const updatePayload: Partial<FirestoreScheduleRecord> = {
      ...cleanedUpdates,
      updatedAt: nowIso(),
    };
    await updateDoc(ref, updatePayload as Record<string, unknown>);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Schedule not found');
    }
    const data = snapshot.data() as FirestoreScheduleRecord;
    return toSchedule(snapshot.id, data);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SCHEDULES, id);
    await deleteDoc(ref);
  },

  async checkConflict(
    classroomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<boolean> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SCHEDULES);
    const snapshot = await withRetry(() => getDocs(
      query(ref, where('classroomId', '==', classroomId), where('date', '==', date))
    ), { attempts: 3, shouldRetry: isNetworkError });

    return snapshot.docs.some((docSnapshot) => {
      if (excludeId && docSnapshot.id === excludeId) {
        return false;
      }
      const data = docSnapshot.data() as FirestoreScheduleRecord;
      if (data.status === 'cancelled') {
        return false;
      }
      return timesOverlap(startTime, endTime, data.startTime, data.endTime);
    });
  },

  async cancelApprovedBooking(scheduleId: string, adminFeedback: string): Promise<void> {
    // Use callable Cloud Function to perform admin-only cancellation server-side.
    // This avoids client-side role checks and Firestore rules conflicts.
    const fb = typeof adminFeedback === 'string' ? adminFeedback.trim() : '';
    if (!fb) {
      throw new Error('adminFeedback (cancellation reason) is required when cancelling an approved booking.');
    }

    try {
  const functions = getFunctions(getFirebaseApp(), 'us-central1');
  const fn = httpsCallable(functions, 'cancelApprovedBooking');
  await withRetry(() => fn({ scheduleId, adminFeedback: fb }), { attempts: 3, shouldRetry: isNetworkError });
      return;
    } catch (err: any) {
      // Surface clearer error messages coming from cloud function
      const message = err?.message || err?.code || 'Failed to cancel approved booking';
      throw new Error(message);
    }
  },
};

// ============================================
// SIGNUP REQUEST SERVICE
// ============================================

/**
 * Signup request service for managing faculty registration requests.
 * 
 * Handles the approval workflow for new faculty accounts.
 * Provides operations for:
 * - Retrieving pending signup requests
 * - Approving or rejecting signup requests (admin)
 * - Updating signup request status
 * - Bulk operations for managing multiple requests
 * - Cleanup of processed requests
 */
export const signupRequestService = {
  async getAll(): Promise<SignupRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SIGNUP_REQUESTS);
  const q = query(ref, orderBy('requestDate', 'desc'));
  const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreSignupRequestRecord;
      return toSignupRequest(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<SignupRequest | null> {
    const database = getDb();
  const ref = doc(database, COLLECTIONS.SIGNUP_REQUESTS, id);
  const snapshot = await withRetry(() => getDoc(ref), { attempts: 3, shouldRetry: isNetworkError });
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as FirestoreSignupRequestRecord;
    return toSignupRequest(snapshot.id, data);
  },

  async getByEmail(email: string): Promise<SignupRequest | null> {
    const emailLower = email.toLowerCase();
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SIGNUP_REQUESTS);
  const q = query(ref, where('emailLower', '==', emailLower), where('status', '==', 'pending'));
  const snapshot = await withRetry(() => getDocs(q), { attempts: 3, shouldRetry: isNetworkError });
    if (snapshot.empty) {
      return null;
    }
    const docSnapshot = snapshot.docs[0];
    const data = docSnapshot.data() as FirestoreSignupRequestRecord;
    return toSignupRequest(docSnapshot.id, data);
  },

  async create(
    request: Omit<SignupRequest, 'id' | 'requestDate' | 'status'>
  ): Promise<SignupRequest> {
    const database = getDb();
    const now = nowIso();
    const record: FirestoreSignupRequestRecord = {
      uid: request.userId,
      email: request.email,
      emailLower: request.email.toLowerCase(),
      name: request.name,
      department: request.department,
      status: 'pending',
      requestDate: now,
      adminFeedback: request.adminFeedback,
      resolvedAt: request.resolvedAt,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(collection(database, COLLECTIONS.SIGNUP_REQUESTS), record);
    return toSignupRequest(ref.id, record);
  },

  async update(id: string, updates: Partial<SignupRequest>): Promise<SignupRequest> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SIGNUP_REQUESTS, id);
    
    // Filter out undefined values to prevent Firebase errors
    const cleanedUpdates = removeUndefinedValues(updates);
    
    const updatePayload: Partial<FirestoreSignupRequestRecord> = {
      ...cleanedUpdates,
      updatedAt: nowIso(),
    };
    
    if (typeof cleanedUpdates.email === 'string') {
      updatePayload.emailLower = cleanedUpdates.email.toLowerCase();
    }
    
    await updateDoc(ref, updatePayload as Record<string, unknown>);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Signup request not found');
    }
    const data = snapshot.data() as FirestoreSignupRequestRecord;

    // Notify the user if their signup was approved or rejected
    if (updatePayload.status === 'approved' || updatePayload.status === 'rejected') {
      try {
        await notificationService.createNotification(
          data.uid,
          updatePayload.status === 'approved' ? 'approved' : 'rejected',
          updatePayload.status === 'approved'
            ? `Your account request has been approved. You can now sign in.`
            : `Your account request was rejected. Admin feedback: ${updatePayload.adminFeedback || 'No feedback provided.'}`,
          { adminFeedback: updatePayload.adminFeedback, actorId: currentUserCache?.id }
        );
      } catch (err) {
        logger.warn('Failed to create signup notification:', err);
      }
    }
    return toSignupRequest(snapshot.id, data);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SIGNUP_REQUESTS, id);
    await deleteDoc(ref);
  },

  // Method to properly reject a signup and clean up everything
  async rejectAndCleanup(requestId: string, adminUserId: string, feedback: string): Promise<SignupHistory> {
    const request = await this.getById(requestId);
    if (!request) {
      throw new Error('Signup request not found');
    }

    const resolvedAt = nowIso();
    
    // Create history record before cleanup
    const historyRecord = await signupHistoryService.create({
      userId: request.userId,
      email: request.email,
      name: request.name,
      department: request.department,
      requestDate: request.requestDate,
      status: 'rejected',
      adminFeedback: feedback,
      resolvedAt,
      processedBy: adminUserId,
    });

    // Notify the user that their signup was rejected and account will be removed
    try {
      await notificationService.createNotification(
        request.userId,
        'rejected',
        `Your signup request was rejected by an administrator. Feedback: ${feedback}`,
        { adminFeedback: feedback, actorId: currentUserCache?.id }
      );
    } catch (err) {
      logger.warn('Failed to notify user about signup rejection cleanup:', err);
    }

    try {
      // Use the new Firebase Functions approach for complete account deletion
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
  const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      
  // Call the cloud function to delete the user account completely (with retries)
  const result = await withRetry(() => deleteUserAccount({ userId: request.userId }), { attempts: 3, shouldRetry: isNetworkError });
  logger.log('Account deletion result:', result.data);
      
      // Delete the signup request from Firestore
      await this.delete(requestId);

      return historyRecord;
    } catch (error) {
      // If cleanup fails, we should remove the history record to maintain consistency
      try {
        await signupHistoryService.delete(historyRecord.id);
      } catch (historyDeleteError) {
        logger.error('Failed to clean up history record after failed rejection:', historyDeleteError);
      }
      throw error;
    }
  },

  // Bulk cleanup for rejected accounts using Firebase Functions
  async bulkCleanupRejectedAccounts(): Promise<{
    success: boolean;
    message: string;
    processedCount: number;
    successfulDeletions: number;
    errors: string[];
  }> {
    try {
      const app = getFirebaseApp();
      const functions = getFunctions(app, 'us-central1');
      const bulkCleanup = httpsCallable(functions, 'bulkCleanupRejectedAccounts');
      
      // Call the cloud function (with retries)
      const result = await withRetry(() => bulkCleanup({}), { attempts: 3, shouldRetry: isNetworkError });
      return result.data as {
        success: boolean;
        message: string;
        processedCount: number;
        successfulDeletions: number;
        errors: string[];
      };
    } catch (error) {
      logger.error('Bulk cleanup error:', error);
      throw new Error(`Failed to perform bulk cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Bulk update signup requests using Firestore write batch
  async bulkUpdate(updates: Array<{ id: string; data: Partial<SignupRequest> }>): Promise<void> {
    const payloads = updates.map(u => ({ id: u.id, data: u.data as Record<string, unknown> }));
    await bulkUpdateDocs(COLLECTIONS.SIGNUP_REQUESTS, payloads);
  },
};

// Re-export notification service for consistency with other services.
// Wraps the setupNotificationsListener so that unsubscribes are tracked
// by the central `activeUnsubscribes` array and can be cleaned up on sign-out.
const _notificationServiceWrapped = {
  ...notificationServiceImport,
  setupNotificationsListener: (
    callback: (items: any[]) => void,
    errorCallback?: (error: Error) => void,
    userId?: string
  ) => {
    const unsub = notificationServiceImport.setupNotificationsListener(callback as any, errorCallback, userId);
    if (typeof unsub === 'function') {
      activeUnsubscribes.push(unsub as Unsubscribe);
    }
    return unsub;
  },
};

/**
 * Notification service wrapper that integrates with the central unsubscribe management.
 * See lib/notificationService.ts for detailed documentation.
 */
export const notificationService = _notificationServiceWrapped as typeof notificationServiceImport;

// ============================================
// SIGNUP HISTORY SERVICE
// ============================================

/**
 * Signup history service for tracking processed signup requests.
 * 
 * Maintains a permanent record of all approved and rejected signups.
 * Useful for auditing and tracking registration history.
 */export const signupHistoryService = {
  async getAll(): Promise<SignupHistory[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SIGNUP_HISTORY);
    const q = query(ref, orderBy('resolvedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreSignupHistoryRecord;
      return toSignupHistory(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<SignupHistory | null> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SIGNUP_HISTORY, id);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as FirestoreSignupHistoryRecord;
    return toSignupHistory(snapshot.id, data);
  },

  async getByEmail(email: string): Promise<SignupHistory[]> {
    const emailLower = email.toLowerCase();
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SIGNUP_HISTORY);
    const q = query(ref, where('emailLower', '==', emailLower), orderBy('resolvedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreSignupHistoryRecord;
      return toSignupHistory(docSnapshot.id, data);
    });
  },

  async create(
    history: Omit<SignupHistory, 'id'>
  ): Promise<SignupHistory> {
    const database = getDb();
    const now = nowIso();
    const record: FirestoreSignupHistoryRecord = {
      uid: history.userId,
      email: history.email,
      emailLower: history.email.toLowerCase(),
      name: history.name,
      department: history.department,
      requestDate: history.requestDate,
      status: history.status,
      adminFeedback: history.adminFeedback,
      resolvedAt: history.resolvedAt,
      processedBy: history.processedBy,
      createdAt: now,
      updatedAt: now,
    };
    const ref = await addDoc(collection(database, COLLECTIONS.SIGNUP_HISTORY), record);
    return toSignupHistory(ref.id, record);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SIGNUP_HISTORY, id);
    await deleteDoc(ref);
  },
};

// ============================================
// UNSUPPORTED LOCAL UTILITIES
// ============================================

// ============================================
// REAL-TIME DATA SERVICE
// ============================================

/**
 * Real-time service for managing live data subscriptions.
 * 
 * Provides centralized management of Firestore real-time listeners:
 * - Automatic cleanup on user sign-out
 * - Prevents duplicate listener registration
 * - Memory leak prevention
 * - Coordinated listener lifecycle management
 * 
 * The service automatically sets up appropriate listeners based on user role
 * and cleans them up when the user signs out or when explicitly requested.
 */
export const realtimeService = {
  // Clean up all active listeners
  cleanup() {
    logger.log('🧹 Cleaning up real-time listeners...');
    activeUnsubscribes.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        logger.error('Error unsubscribing listener:', error);
      }
    });
    activeUnsubscribes = [];
    
    // Clear all listener sets
    Object.values(dataListeners).forEach((listenerSet) => {
      listenerSet.clear();
    });
  },

  // Subscribe to real-time data updates
  subscribeToData(
    user: User | null,
    callbacks: {
      onClassroomsUpdate: (classrooms: Classroom[]) => void;
      onBookingRequestsUpdate: (requests: BookingRequest[]) => void;
      onSchedulesUpdate: (schedules: Schedule[]) => void;
      onSignupRequestsUpdate?: (requests: SignupRequest[]) => void;
      onSignupHistoryUpdate?: (history: import('../App').SignupHistory[]) => void;
      onUsersUpdate?: (users: User[]) => void;
      onError?: (error: Error) => void;
    }
  ) {
    logger.log('🔄 Setting up real-time listeners for user:', user?.email);
    
      // If we've already set up listeners for this exact user, skip re-setup
      if (user?.id && currentRealtimeUserId === user.id && activeUnsubscribes.length > 0) {
        logger.log('⚠️ Real-time listeners already active for this user, skipping re-registration');
        return;
      }

      // Clean up any existing listeners first
      this.cleanup();

    const { 
      onClassroomsUpdate, 
      onBookingRequestsUpdate, 
      onSchedulesUpdate, 
      onSignupRequestsUpdate, 
      onSignupHistoryUpdate,
      onUsersUpdate, 
      onError 
    } = callbacks;

    try {
      // Always subscribe to classrooms (all users need this)
      setupClassroomsListener(onClassroomsUpdate, onError);

      if (user?.role === 'admin') {
        // Admin gets all data
        setupBookingRequestsListener(onBookingRequestsUpdate, onError);
        setupSchedulesListener(onSchedulesUpdate, onError);
        
        if (onSignupRequestsUpdate) {
          setupSignupRequestsListener(onSignupRequestsUpdate, onError);
        }

        if (onSignupHistoryUpdate) {
          setupSignupHistoryListener(onSignupHistoryUpdate, onError);
        }

        if (onUsersUpdate) {
          setupUsersListener(onUsersUpdate, onError);
        }
      } else if (user?.role === 'faculty') {
        // Faculty gets filtered data
        setupBookingRequestsListener(onBookingRequestsUpdate, onError, user.id);
        setupSchedulesListener(onSchedulesUpdate, onError, user.id);
      }

      // Mark which user these listeners belong to so we can avoid redundant setups
      currentRealtimeUserId = user?.id ?? null;

      logger.log(`✅ Real-time listeners setup complete for ${user?.role || 'anonymous'} user`);
    } catch (error) {
      logger.error('❌ Failed to setup real-time listeners:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  },

  // Get current listener count (for debugging)
  getListenerCount() {
    return activeUnsubscribes.length;
  }
};

export const clearAllData = (): never => {
  throw new Error(
    'clearAllData is not supported with the Firebase backend. Manage records via the Firebase console or admin scripts.'
  );
};

export const exportAllData = (): never => {
  throw new Error(
    'exportAllData is not available with the Firebase backend. Use Firestore export tools instead.'
  );
};

export const importAllData = (): never => {
  throw new Error(
    'importAllData is not available with the Firebase backend. Use Firestore import tools instead.'
  );
};

// Admin helper: call server-side deleteUserAccount Cloud Function
export async function adminDeleteUser(userId: string, hardDelete = false) {
  const app = getFirebaseApp();
  const functions = getFunctions(app, 'us-central1');
  const fn = httpsCallable(functions, 'deleteUserAccount');
  const result = await withRetry(() => fn({ userId, hardDelete }), { attempts: 3, shouldRetry: isNetworkError });
  return result.data;
}
