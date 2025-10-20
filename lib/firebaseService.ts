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
import type { BookingRequest, Classroom, Schedule, SignupRequest, SignupHistory, User } from '../App';
import { getFirebaseDb, getFirebaseApp, getFirebaseAuth as getAuthInstance } from './firebaseConfig';
import { isPastBookingTime } from '../utils/timeUtils';

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
  status: 'pending' | 'approved' | 'rejected';
  photoURL?: string;
  lastSignInAt?: string;
  createdAt?: string;
  updatedAt?: string;
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  lockedUntil?: string;
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

const unsubscribeAllListeners = () => {
  console.log(`Unsubscribing from ${activeUnsubscribes.length} real-time listeners.`);
  activeUnsubscribes.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn('Error during listener unsubscribe:', error);
    }
  });
  activeUnsubscribes = [];
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
      console.error('Data listener error:', error);
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
      console.error('Classrooms listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    console.error('Classrooms listener error:', error);
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
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreBookingRequestRecord;
        return toBookingRequest(doc.id, data);
      });
      callback(requests);
    } catch (error) {
      console.error('BookingRequests listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    console.error('BookingRequests listener error:', error);
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
      console.error('Schedules listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    console.error('Schedules listener error:', error);
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
      console.error('SignupRequests listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    console.error('SignupRequests listener error:', error);
    errorCallback?.(error);
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
      console.error('Users listener error:', error);
      errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, (error) => {
    console.error('Users listener error:', error);
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
      console.error('Auth listener error:', error);
    }
  });
};

const nowIso = () => new Date().toISOString();

// Helper function to remove undefined values from update objects
const removeUndefinedValues = <T>(obj: Partial<T>): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
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
  status: data.status,
  failedLoginAttempts: data.failedLoginAttempts || 0,
  accountLocked: data.accountLocked || false,
  lockedUntil: data.lockedUntil,
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
  const snapshot = await getDocs(q);

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
  const snapshot = await getDoc(ref);
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
        console.warn('Could not fetch signup request for user:', firebaseUser.uid, error);
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
      console.log('Auth state change suppressed temporarily (registration/reactivation flow)');
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
        console.error('Token refresh failed in auth listener:', tokenError);
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
      console.error('Auth state listener error:', error);
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

export const authService = {
  async handleRejectedUserReactivation(
    email: string,
    password: string,
    name: string,
    department: string
  ): Promise<{ request: SignupRequest }> {
    // If a user's signup was rejected, their Auth account was likely deleted.
    // In this case, reactivation is the same as a new registration.
    // We can check if the user exists by trying to fetch them by email.
    // If they don't exist, we just call the normal registration flow.
    const existingUser = await userService.getByEmail(email);
    if (!existingUser) {
      console.log(`Reactivation attempt for non-existent user ${email}. Treating as new registration.`);
      // The user was fully deleted, so this is a new registration.
      return this.registerFaculty(email, password, name, department);
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
      };

      await setDoc(doc(database, COLLECTIONS.SIGNUP_REQUESTS, firebaseUser.uid), requestRecord);
      
      await sendEmailVerification(firebaseUser).catch(() => undefined);

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
    department: string
  ): Promise<{ request: SignupRequest }> {
    ensureAuthStateListener();
    const auth = getFirebaseAuth();

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
      };

      await setDoc(doc(database, COLLECTIONS.SIGNUP_REQUESTS, firebaseUser.uid), requestRecord);

      await sendEmailVerification(firebaseUser).catch(() => undefined);

      return { request: toSignupRequest(firebaseUser.uid, requestRecord) };
    } catch (error) {
      // If Firestore operations fail, delete the Auth user to prevent orphaned accounts
      console.error('Signup failed, cleaning up Auth user:', error);
      try {
        await firebaseUser.delete();
        console.log('Auth user deleted successfully');
      } catch (deleteError) {
        console.error('Failed to delete Auth user:', deleteError);
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
    const functions = getFunctions(getFirebaseApp());

    try {
      // Attempt to sign in with Firebase Authentication first
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;
      
      // Force token refresh to ensure we have a valid token
      try {
        await firebaseUser.getIdToken(true);
      } catch (tokenError) {
        console.warn('Failed to refresh token on sign in:', tokenError);
      }
      
      const record = await ensureUserRecordFromAuth(firebaseUser);
      const user = toUser(firebaseUser.uid, record);

      // Check if account is locked (after authentication but before allowing login)
      if (user.accountLocked && user.lockedUntil) {
        const lockedUntilDate = new Date(user.lockedUntil);
        const now = new Date();
        
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

      // Success! Call Cloud Function to reset failed login attempts
      try {
        const resetFailedLogins = httpsCallable(functions, 'resetFailedLogins');
        await resetFailedLogins();
        console.log('✅ Failed login attempts reset');
      } catch (cloudFunctionError) {
        console.warn('⚠️ Failed to call resetFailedLogins cloud function:', cloudFunctionError);
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
          console.error('Failed to reset login attempts (fallback):', fallbackError);
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
      console.log('🔍 Login error details:', {
        error,
        code: error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : 'no-code',
        message: error instanceof Error ? error.message : 'unknown'
      });

      // Always try to track failed login for any authentication error
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        
        // Track any auth-related error
        if (code?.startsWith('auth/')) {
          console.log('🔒 Calling trackFailedLogin for:', email);
          
          try {
            const trackFailedLogin = httpsCallable(functions, 'trackFailedLogin');
            const result = await trackFailedLogin({ email });
            const data = result.data as { 
              locked?: boolean; 
              attemptsRemaining?: number; 
              message?: string; // This message is now user-facing
              lockedUntil?: string;
            };
  
            console.log('✅ trackFailedLogin response:', data);

            if (data.locked) {
              throw new Error(data.message || 'Account locked due to too many failed login attempts. Please try again in 30 minutes.');
            } else if (data.message) {
              // Show warning about remaining attempts
              throw new Error(data.message);
            }
          } catch (trackError) {
            console.error('❌ trackFailedLogin error:', trackError);
            
            // If tracking fails or throws our custom error, handle it
            if (trackError instanceof Error && 
                (trackError.message.includes('Account locked') || 
                 trackError.message.includes('attempts remaining'))) {
              throw trackError;
            }
            console.warn('⚠️ Failed to track login attempt:', trackError);
            // Continue with normal error handling
          }
        }
      }
      
          // Throw a more generic error if we haven't thrown a specific one yet
          if (error instanceof Error && (error.message.includes('Account locked') || error.message.includes('attempts remaining'))) {
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
      console.error('Password reset error:', error);
      
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
      console.error('Confirm password reset error:', error);
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
        console.warn('Failed to refresh token:', tokenError);
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
      console.error('Failed to fetch current user:', error);
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
              console.error('Failed to remove auth listener', error);
              errorCallback?.('Failed to unsubscribe from auth updates');
            }
          },
        },
      },
    };
  },

  async signOutDueToIdleTimeout(): Promise<void> {
    console.log('🕒 User session expired due to inactivity - logging out');
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

export const userService = {
  async getAll(): Promise<User[]> {
    const database = getDb();
    const usersRef = collection(database, COLLECTIONS.USERS);
    const q = query(usersRef, orderBy('name'));
    const snapshot = await getDocs(q);
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

    await updateDoc(userRef, {
      failedLoginAttempts: 0,
      accountLocked: false,
      lockedUntil: null,
      updatedAt: nowIso(),
    });

    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    const record = ensureUserData(snapshot);
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
        console.log(`Deleted ${bookingDeletes.length} related booking request(s) for classroom ${id}`);
      }

      if (scheduleDeletes.length > 0) {
        await chunkAndCommit(scheduleDeletes);
        console.log(`Deleted ${scheduleDeletes.length} related schedule(s) for classroom ${id}`);
      }
    } catch (cascadeError) {
      console.error('Error during cascade deletion for classroom:', cascadeError);
      // proceed to still delete classroom document even if cascade had issues
    }

    await deleteDoc(ref);
  },

  // Call server-side cascade delete (admin-only). Returns deleted related count.
  async deleteCascade(id: string): Promise<{ success: boolean; deletedRelated: number }> {
    const app = getFirebaseApp();
    const functions = getFunctions(app);
    const deleteClassroomCascade = httpsCallable(functions, 'deleteClassroomCascade');
    const result = await deleteClassroomCascade({ classroomId: id });
    return result.data as { success: boolean; deletedRelated: number };
  },
};

// ============================================
// BOOKING REQUEST SERVICE
// ============================================

const timesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
) =>
  (startA >= startB && startA < endB) ||
  (endA > startB && endA <= endB) ||
  (startA <= startB && endA >= endB);

export const bookingRequestService = {
  async getAll(): Promise<BookingRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.BOOKING_REQUESTS);
    const q = query(ref, orderBy('requestDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreBookingRequestRecord;
      return toBookingRequest(docSnapshot.id, data);
    });
  },

  async getAllForFaculty(facultyId: string): Promise<BookingRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.BOOKING_REQUESTS);
    const q = query(ref, where('facultyId', '==', facultyId), orderBy('requestDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreBookingRequestRecord;
      return toBookingRequest(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<BookingRequest | null> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.BOOKING_REQUESTS, id);
    const snapshot = await getDoc(ref);
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
    };
    await updateDoc(ref, updatePayload as Record<string, unknown>);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Booking request not found');
    }
    const data = snapshot.data() as FirestoreBookingRequestRecord;
    return toBookingRequest(snapshot.id, data);
  },

  async delete(id: string): Promise<void> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.BOOKING_REQUESTS, id);
    await deleteDoc(ref);
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
    const snapshot = await getDocs(
      query(ref, where('classroomId', '==', classroomId), where('date', '==', date))
    );

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

  async cancelApprovedBooking(scheduleId: string): Promise<void> {
    // Check if user is admin
    const user = await authService.getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Only administrators can cancel approved bookings');
    }

    const database = getDb();
    const ref = doc(database, COLLECTIONS.SCHEDULES, scheduleId);
    
    // Verify the schedule exists
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Schedule not found');
    }

    // Update the schedule status to cancelled
    await updateDoc(ref, {
      status: 'cancelled',
      updatedAt: nowIso(),
    });
  },
};

// ============================================
// SIGNUP REQUEST SERVICE
// ============================================

export const signupRequestService = {
  async getAll(): Promise<SignupRequest[]> {
    const database = getDb();
    const ref = collection(database, COLLECTIONS.SIGNUP_REQUESTS);
    const q = query(ref, orderBy('requestDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreSignupRequestRecord;
      return toSignupRequest(docSnapshot.id, data);
    });
  },

  async getById(id: string): Promise<SignupRequest | null> {
    const database = getDb();
    const ref = doc(database, COLLECTIONS.SIGNUP_REQUESTS, id);
    const snapshot = await getDoc(ref);
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
    const snapshot = await getDocs(q);
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

    try {
      // Use the new Firebase Functions approach for complete account deletion
      const app = getFirebaseApp();
      const functions = getFunctions(app);
      const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      
      // Call the cloud function to delete the user account completely
      const result = await deleteUserAccount({ userId: request.userId });
      console.log('Account deletion result:', result.data);
      
      // Delete the signup request from Firestore
      await this.delete(requestId);

      return historyRecord;
    } catch (error) {
      // If cleanup fails, we should remove the history record to maintain consistency
      try {
        await signupHistoryService.delete(historyRecord.id);
      } catch (historyDeleteError) {
        console.error('Failed to clean up history record after failed rejection:', historyDeleteError);
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
      const functions = getFunctions(app);
      const bulkCleanup = httpsCallable(functions, 'bulkCleanupRejectedAccounts');
      
      // Call the cloud function
      const result = await bulkCleanup({});
      return result.data as {
        success: boolean;
        message: string;
        processedCount: number;
        successfulDeletions: number;
        errors: string[];
      };
    } catch (error) {
      console.error('Bulk cleanup error:', error);
      throw new Error(`Failed to perform bulk cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};

// ============================================
// SIGNUP HISTORY SERVICE
// ============================================

export const signupHistoryService = {
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

export const realtimeService = {
  // Clean up all active listeners
  cleanup() {
    console.log('🧹 Cleaning up real-time listeners...');
    activeUnsubscribes.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing listener:', error);
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
      onUsersUpdate?: (users: User[]) => void;
      onError?: (error: Error) => void;
    }
  ) {
    console.log('🔄 Setting up real-time listeners for user:', user?.email);
    
    // Clean up any existing listeners first
    this.cleanup();

    const { 
      onClassroomsUpdate, 
      onBookingRequestsUpdate, 
      onSchedulesUpdate, 
      onSignupRequestsUpdate, 
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
        
        if (onUsersUpdate) {
          setupUsersListener(onUsersUpdate, onError);
        }
      } else if (user?.role === 'faculty') {
        // Faculty gets filtered data
        setupBookingRequestsListener(onBookingRequestsUpdate, onError, user.id);
        setupSchedulesListener(onSchedulesUpdate, onError, user.id);
      }

      console.log(`✅ Real-time listeners setup complete for ${user?.role || 'anonymous'} user`);
    } catch (error) {
      console.error('❌ Failed to setup real-time listeners:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  },

  // Get current listener count (for debugging)
  getListenerCount() {
    return activeUnsubscribes.length;
  }
};

// Client helper: call testPush cloud function (admin-only). Returns callable result.data.
export const callTestPush = async (userId: string) => {
  const app = getFirebaseApp();
  // Use the same region where functions are deployed to avoid cross-origin issues
  const functions = getFunctions(app, 'us-central1');
  const fn = httpsCallable(functions, 'testPush');
  const result = await fn({ userId });
  return result.data;
};

export const callGetVapidPublicKey = async () => {
  try {
    const app = getFirebaseApp();
    const functions = getFunctions(app, 'us-central1');
    const fn = httpsCallable(functions, 'getVapidPublicKey');
    const res = await fn({});
    return res.data;
  } catch (error) {
    console.warn('Failed to fetch VAPID public key', error);
    return { ok: false };
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
