import { vi } from 'vitest';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { DocumentSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';

/**
 * Shared Firebase mock helpers for all test files
 * 
 * Provides consistent mocking of Firebase services:
 * - Cloud Functions (httpsCallable)
 * - Firestore (getDocs, getDoc, addDoc, updateDoc, deleteDoc)
 * - Auth (getAuth, currentUser)
 * - Factory functions for test data
 */

// Mock Firebase Auth User
export const mockAuthUser: Partial<FirebaseAuthUser> = {
  uid: 'test-user-123',
  email: 'test@plv.edu.ph',
  emailVerified: true,
  displayName: 'Test User',
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
  getIdTokenResult: vi.fn().mockResolvedValue({
    claims: { admin: false, role: 'faculty' },
    token: 'mock-token',
  }),
};

// Mock Auth instance
export const mockAuth = {
  currentUser: mockAuthUser as FirebaseAuthUser,
  onAuthStateChanged: vi.fn(() => () => {}),
  signOut: vi.fn().mockResolvedValue(undefined),
};

// Mock Cloud Functions callable
export const mockHttpsCallable = vi.fn((payload?: any) => {
  return Promise.resolve({
    data: {
      success: true,
      id: 'mock-id',
      skipped: false,
      unreadCount: 0,
      ...payload,
    },
  });
});

// Mock Firestore document snapshot
export const createMockDocSnapshot = <T = DocumentData>(
  id: string,
  data: T
): DocumentSnapshot<T> => {
  return {
    id,
    exists: () => true,
    data: () => data as T,
    get: vi.fn(),
    ref: {} as any,
    metadata: {} as any,
  } as DocumentSnapshot<T>;
};

// Mock Firestore query snapshot
export const createMockQuerySnapshot = <T = DocumentData>(
  docs: Array<{ id: string; data: T }>
): QuerySnapshot<T> => {
  const mockDocs = docs.map(({ id, data }) => createMockDocSnapshot(id, data));
  return {
    docs: mockDocs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: vi.fn((callback: (doc: DocumentSnapshot<T>) => void) => {
      mockDocs.forEach(callback);
    }),
    docChanges: vi.fn(() => []),
    metadata: {} as any,
    query: {} as any,
  } as QuerySnapshot<T>;
};

// Mock Firestore functions
export const mockGetDocs = vi.fn().mockResolvedValue(
  createMockQuerySnapshot([])
);

export const mockGetDoc = vi.fn().mockResolvedValue(
  createMockDocSnapshot('mock-id', {})
);

export const mockAddDoc = vi.fn().mockResolvedValue({
  id: 'new-doc-id',
} as any);

export const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);

export const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);

export const mockSetDoc = vi.fn().mockResolvedValue(undefined);

// Factory functions for test data
export const createMockBookingRequest = (overrides: any = {}) => ({
  id: overrides.id ?? 'req_1',
  facultyId: overrides.facultyId ?? 'faculty_123',
  facultyName: overrides.facultyName ?? 'Test Faculty',
  classroomId: overrides.classroomId ?? 'class_1',
  classroomName: overrides.classroomName ?? 'Room A',
  date: overrides.date ?? '2024-01-15',
  startTime: overrides.startTime ?? '09:00',
  endTime: overrides.endTime ?? '10:00',
  purpose: overrides.purpose ?? 'Lecture',
  status: overrides.status ?? 'pending',
  requestDate: overrides.requestDate ?? new Date().toISOString(),
  adminFeedback: overrides.adminFeedback ?? null,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  updatedBy: overrides.updatedBy ?? null,
});

export const createMockUser = (overrides: any = {}) => ({
  id: overrides.id ?? 'user_1',
  email: overrides.email ?? 'test@plv.edu.ph',
  name: overrides.name ?? 'Test User',
  role: overrides.role ?? 'faculty',
  department: overrides.department ?? 'CEIT',
  status: overrides.status ?? 'approved',
  failedLoginAttempts: overrides.failedLoginAttempts ?? 0,
  accountLocked: overrides.accountLocked ?? false,
  lockedUntil: overrides.lockedUntil ?? null,
  lockedByAdmin: overrides.lockedByAdmin ?? false,
  pushEnabled: overrides.pushEnabled ?? true,
  lastSignInAt: overrides.lastSignInAt ?? null,
});

export const createMockSchedule = (overrides: any = {}) => ({
  id: overrides.id ?? 'sched_1',
  classroomId: overrides.classroomId ?? 'class_1',
  classroomName: overrides.classroomName ?? 'Room A',
  facultyId: overrides.facultyId ?? 'faculty_123',
  facultyName: overrides.facultyName ?? 'Test Faculty',
  date: overrides.date ?? '2024-01-15',
  startTime: overrides.startTime ?? '09:00',
  endTime: overrides.endTime ?? '10:00',
  purpose: overrides.purpose ?? 'Class',
  status: overrides.status ?? 'confirmed',
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
});

export const createMockClassroom = (overrides: any = {}) => ({
  id: overrides.id ?? 'class_1',
  name: overrides.name ?? 'Room A',
  capacity: overrides.capacity ?? 30,
  equipment: overrides.equipment ?? [],
  building: overrides.building ?? 'Main Building',
  floor: overrides.floor ?? 1,
  isAvailable: overrides.isAvailable ?? true,
});

// Reset all mocks helper
export const resetFirebaseMocks = () => {
  vi.clearAllMocks();
  mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));
  mockGetDoc.mockResolvedValue(createMockDocSnapshot('mock-id', {}));
  mockAddDoc.mockResolvedValue({ id: 'new-doc-id' } as any);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockSetDoc.mockResolvedValue(undefined);
  mockHttpsCallable.mockResolvedValue({
    data: { success: true, id: 'mock-id', skipped: false, unreadCount: 0 },
  });
};

