import { vi } from 'vitest'

// Mock User
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  emailVerified: true,
  photoURL: null,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-id-token',
    claims: { role: 'faculty' },
  }),
  reload: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
}

export const mockAdminUser = {
  ...mockUser,
  uid: 'admin-user-id',
  email: 'admin@example.com',
  getIdTokenResult: vi.fn().mockResolvedValue({
    token: 'mock-admin-token',
    claims: { role: 'admin' },
  }),
}

// Mock Auth
export const mockAuth = {
  currentUser: null as any,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  updateProfile: vi.fn(),
  setPersistence: vi.fn(),
}

// Mock Firestore Document Reference
export const createMockDocRef = (id: string, data?: any) => ({
  id,
  path: `collection/${id}`,
  get: vi.fn().mockResolvedValue({
    id,
    exists: () => !!data,
    data: () => data,
  }),
  set: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  onSnapshot: vi.fn(),
})

// Mock Firestore Query Snapshot
export const createMockQuerySnapshot = (docs: any[]) => ({
  docs: docs.map((doc) => ({
    id: doc.id,
    data: () => doc,
    exists: () => true,
    ref: createMockDocRef(doc.id, doc),
  })),
  empty: docs.length === 0,
  size: docs.length,
  forEach: vi.fn((callback) => {
    docs.forEach((doc) => callback({
      id: doc.id,
      data: () => doc,
      exists: () => true,
    }))
  }),
})

// Mock Firestore Query
export const createMockQuery = (docs: any[] = []) => ({
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(createMockQuerySnapshot(docs)),
  onSnapshot: vi.fn(),
})

// Mock Firestore Collection Reference
export const createMockCollectionRef = (docs: any[] = []) => ({
  doc: vi.fn((id?: string) => createMockDocRef(id || 'mock-doc-id')),
  add: vi.fn((data) => Promise.resolve(createMockDocRef('new-doc-id', data))),
  get: vi.fn().mockResolvedValue(createMockQuerySnapshot(docs)),
  where: vi.fn().mockReturnValue(createMockQuery(docs)),
  orderBy: vi.fn().mockReturnValue(createMockQuery(docs)),
  limit: vi.fn().mockReturnValue(createMockQuery(docs)),
  onSnapshot: vi.fn(),
})

// Mock Firestore
export const mockFirestore = {
  collection: vi.fn((path: string) => createMockCollectionRef()),
  doc: vi.fn((path: string) => createMockDocRef('mock-doc-id')),
  runTransaction: vi.fn(),
  batch: vi.fn(),
}

// Mock Cloud Functions
export const mockFunctions = {
  httpsCallable: vi.fn((name: string) => {
    return vi.fn().mockResolvedValue({ data: { success: true } })
  }),
}

// Mock Firebase App
export const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {
    apiKey: 'mock-api-key',
    authDomain: 'mock-auth-domain',
    projectId: 'mock-project-id',
  },
  automaticDataCollectionEnabled: false,
}

// Export mock functions for firebase/auth
export const signInWithEmailAndPassword = vi.fn()
export const createUserWithEmailAndPassword = vi.fn()
export const signOut = vi.fn()
export const sendPasswordResetEmail = vi.fn()
export const updateEmail = vi.fn()
export const updatePassword = vi.fn()
export const updateProfile = vi.fn()
export const onAuthStateChanged = vi.fn()
export const setPersistence = vi.fn()
export const browserLocalPersistence = 'LOCAL'

// Export mock functions for firebase/firestore
export const collection = vi.fn()
export const doc = vi.fn()
export const getDoc = vi.fn()
export const getDocs = vi.fn()
export const setDoc = vi.fn()
export const updateDoc = vi.fn()
export const deleteDoc = vi.fn()
export const addDoc = vi.fn()
export const query = vi.fn()
export const where = vi.fn()
export const orderBy = vi.fn()
export const limit = vi.fn()
export const onSnapshot = vi.fn()
export const serverTimestamp = vi.fn(() => new Date())
export const Timestamp = {
  now: vi.fn(() => ({ toDate: () => new Date() })),
  fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
}

// Export mock functions for firebase/functions
export const httpsCallable = vi.fn()
export const getFunctions = vi.fn(() => mockFunctions)

// Export mock for firebase/app
export const initializeApp = vi.fn(() => mockFirebaseApp)
export const getApp = vi.fn(() => mockFirebaseApp)
export const getAuth = vi.fn(() => mockAuth)
export const getFirestore = vi.fn(() => mockFirestore)
