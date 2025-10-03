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
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
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
  updateProfile,
  type Auth,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import type { BookingRequest, Classroom, Schedule, SignupRequest, User } from '../App';
import { getFirebaseDb, getFirebaseApp, getFirebaseAuth as getAuthInstance } from './firebaseConfig';

const db = () => getFirebaseDb();

let authInstance: Auth | null = null;

const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
};

const ADMIN_EMAILS = (import.meta.env.VITE_FIREBASE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email: string) => email.trim().toLowerCase())
  .filter(Boolean);

const COLLECTIONS = {
  USERS: 'users',
  CLASSROOMS: 'classrooms',
  BOOKING_REQUESTS: 'bookingRequests',
  SCHEDULES: 'schedules',
  SIGNUP_REQUESTS: 'signupRequests',
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

let currentUserCache: User | null = null;

type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();

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

const sanitizeUserUpdate = (record: Partial<FirestoreUserRecord>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as Record<string, unknown>;

const isConfiguredAdminEmail = (email?: string | null): boolean => {
  if (!email) {
    return false;
  }
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

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

// ============================================
// AUTHENTICATION SERVICE
// ============================================

let authStateInitialized = false;
let authStateReadyPromise: Promise<void> | null = null;
let authStateReadyResolve: (() => void) | null = null;

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
    const isAdmin = overrides.role === 'admin' || isConfiguredAdminEmail(email);
    const record: FirestoreUserRecord = {
      email,
      emailLower,
      name: overrides.name ?? firebaseUser.displayName ?? email,
      role: overrides.role ?? (isAdmin ? 'admin' : 'faculty'),
      department: overrides.department,
      status: overrides.status ?? (isAdmin ? 'approved' : 'pending'),
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

  const updates: Partial<FirestoreUserRecord> = {
    lastSignInAt: now,
    updatedAt: now,
  };

  if (firebaseUser.displayName && firebaseUser.displayName !== existing.name) {
    updates.name = firebaseUser.displayName;
  }

  if (firebaseUser.photoURL && firebaseUser.photoURL !== existing.photoURL) {
    updates.photoURL = firebaseUser.photoURL;
  }

  if (overrides.name && overrides.name !== existing.name) {
    updates.name = overrides.name;
  }

  if (overrides.department !== undefined && overrides.department !== existing.department) {
    updates.department = overrides.department;
  }

  if (overrides.role && overrides.role !== existing.role) {
    updates.role = overrides.role;
  }

  if (overrides.status && overrides.status !== existing.status) {
    updates.status = overrides.status;
  }

  const sanitized = sanitizeUserUpdate(updates);
  if (Object.keys(sanitized).length > 0) {
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
    if (!firebaseUser) {
      currentUserCache = null;
      notifyAuthListeners(null);
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
      } else {
        currentUserCache = user;
        notifyAuthListeners(user);
      }
    } catch (error) {
      console.error('Auth state listener error:', error);
      currentUserCache = null;
      notifyAuthListeners(null);
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
  async registerFaculty(
    email: string,
    password: string,
    name: string,
    department: string
  ): Promise<{ request: SignupRequest }> {
    ensureAuthStateListener();
    const auth = getFirebaseAuth();

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
      await firebaseSignOut(auth).catch(() => undefined);
      currentUserCache = null;
      notifyAuthListeners(null);
    }
  },

  async signIn(email: string, password: string): Promise<User | null> {
    ensureAuthStateListener();
    const auth = getFirebaseAuth();

    try {
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

      if (user.status !== 'approved') {
        await firebaseSignOut(auth);
        currentUserCache = null;
        notifyAuthListeners(null);
        throw new AuthStatusError(
          user.status,
          user.status === 'pending'
            ? 'Your account is awaiting administrator approval.'
            : 'Your account was rejected. Please contact the administrator.'
        );
      }

      currentUserCache = user;
      notifyAuthListeners(user);
      return user;
    } catch (error) {
      if (error instanceof AuthStatusError) {
        throw error;
      }

      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code?: string }).code;
        if (
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password'
        ) {
          return null;
        }
      }

      throw error;
    }
  },

  async signOut(): Promise<void> {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth).catch(() => undefined);
    currentUserCache = null;
    notifyAuthListeners(null);
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

  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      return { success: false, message: 'No authenticated user found' };
    }

    try {
      await firebaseUpdatePassword(firebaseUser, newPassword);
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      const message = mapAuthErrorToMessage(error as { code?: string });
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
        return null;
      }
      
      const record = await ensureUserRecordFromAuth(firebaseUser);
      const user = toUser(firebaseUser.uid, record);

      if (user.status !== 'approved') {
        await firebaseSignOut(auth);
        currentUserCache = null;
        notifyAuthListeners(null);
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
    const updatePayload: Partial<FirestoreClassroomRecord> = {
      ...updates,
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
    await deleteDoc(ref);
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
    const updatePayload: Partial<FirestoreBookingRequestRecord> = {
      ...updates,
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
    const requestsRef = collection(database, COLLECTIONS.BOOKING_REQUESTS);
    const schedulesRef = collection(database, COLLECTIONS.SCHEDULES);

    const [requestsSnapshot, schedulesSnapshot] = await Promise.all([
      getDocs(
        query(
          requestsRef,
          where('classroomId', '==', classroomId),
          where('date', '==', date)
        )
      ),
      getDocs(
        query(
          schedulesRef,
          where('classroomId', '==', classroomId),
          where('date', '==', date)
        )
      ),
    ]);

    const hasRequestConflict = requestsSnapshot.docs.some((docSnapshot) => {
      if (excludeRequestId && docSnapshot.id === excludeRequestId) {
        return false;
      }
      const data = docSnapshot.data() as FirestoreBookingRequestRecord;
      if (data.status === 'rejected') {
        return false;
      }
      return timesOverlap(startTime, endTime, data.startTime, data.endTime);
    });

    if (hasRequestConflict) {
      return true;
    }

    const hasScheduleConflict = schedulesSnapshot.docs.some((docSnapshot) => {
      const data = docSnapshot.data() as FirestoreScheduleRecord;
      if (data.status === 'cancelled') {
        return false;
      }
      return timesOverlap(startTime, endTime, data.startTime, data.endTime);
    });

    return hasScheduleConflict;
  },
};

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
    const updatePayload: Partial<FirestoreScheduleRecord> = {
      ...updates,
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
    const updatePayload: Partial<FirestoreSignupRequestRecord> = {
      ...updates,
      updatedAt: nowIso(),
    };
    if (typeof updates.email === 'string') {
      updatePayload.emailLower = updates.email.toLowerCase();
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
};

// ============================================
// UNSUPPORTED LOCAL UTILITIES
// ============================================

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
