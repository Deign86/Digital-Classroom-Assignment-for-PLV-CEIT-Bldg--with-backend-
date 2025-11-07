import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  authService, 
  userService, 
  classroomService,
  bookingRequestService,
  scheduleService
} from '../../../lib/firebaseService';
import type { Classroom } from '../../../App';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
  confirmPasswordReset: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
  getFirebaseAuth: vi.fn(() => ({ currentUser: null })),
}));

vi.mock('../../../lib/notificationService', () => ({
  default: {
    createNotification: vi.fn(),
  },
}));

vi.mock('../../../utils/timeUtils', () => ({
  isPastBookingTime: vi.fn(() => false),
}));

describe('FirebaseService - Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('should sign in user with email and password', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { getDoc } = await import('firebase/firestore');
      const mockSignIn = vi.mocked(signInWithEmailAndPassword);
      const mockGetDoc = vi.mocked(getDoc);
      
      mockSignIn.mockResolvedValue({
        user: { uid: 'user-123', email: 'test@plv.edu.ph' }
      } as any);

      // Mock getDoc for ensureUserRecordFromAuth
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: 'test@plv.edu.ph',
          name: 'Test User',
          role: 'faculty',
          status: 'approved',
        }),
      } as any);

      const result = await authService.signIn('test@plv.edu.ph', 'password123');
      
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@plv.edu.ph');
      expect(result?.role).toBe('faculty');
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.anything(),
        'test@plv.edu.ph',
        'password123'
      );
    });

    it('should throw error on sign in failure', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const mockSignIn = vi.mocked(signInWithEmailAndPassword);
      
      mockSignIn.mockRejectedValue(new Error('Invalid credentials'));

      await expect(authService.signIn('test@plv.edu.ph', 'wrong')).rejects.toThrow();
    });

    it('should throw error on network errors', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const mockSignIn = vi.mocked(signInWithEmailAndPassword);
      
      const networkError = new Error('Network error');
      (networkError as any).code = 'auth/network-request-failed';
      mockSignIn.mockRejectedValue(networkError);

      await expect(authService.signIn('test@plv.edu.ph', 'password')).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should sign out current user', async () => {
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      const mockSignOut = vi.mocked(firebaseSignOut);
      
      mockSignOut.mockResolvedValue();

      await authService.signOut();
      
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should handle sign out errors gracefully', async () => {
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      const mockSignOut = vi.mocked(firebaseSignOut);
      
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      // signOut doesn't throw - it catches and logs errors
      await expect(authService.signOut()).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email', async () => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const mockReset = vi.mocked(sendPasswordResetEmail);
      
      mockReset.mockResolvedValue();

      await authService.resetPassword('test@plv.edu.ph');
      
      expect(mockReset).toHaveBeenCalledWith(
        expect.anything(),
        'test@plv.edu.ph'
      );
    });

    it('should return error object for invalid email', async () => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const mockReset = vi.mocked(sendPasswordResetEmail);
      
      const error = new Error('Invalid email');
      (error as any).code = 'auth/invalid-email';
      mockReset.mockRejectedValue(error);

      const result = await authService.resetPassword('invalid');
      
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });
});

describe('FirebaseService - User Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should retrieve user by ID', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user-123',
        data: () => ({
          email: 'test@plv.edu.ph',
          name: 'Test User',
          role: 'faculty',
          status: 'approved',
        }),
      } as any);

      const user = await userService.getById('user-123');
      
      expect(user).toBeDefined();
      expect(user?.email).toBe('test@plv.edu.ph');
      expect(user?.role).toBe('faculty');
    });

    it('should return null for non-existent user', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const user = await userService.getById('non-existent');
      
      expect(user).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'user-1',
            data: () => ({
              email: 'user1@plv.edu.ph',
              name: 'User 1',
              role: 'faculty',
              status: 'approved',
            }),
          },
          {
            id: 'user-2',
            data: () => ({
              email: 'user2@plv.edu.ph',
              name: 'User 2',
              role: 'admin',
              status: 'approved',
            }),
          },
        ],
      } as any);

      const users = await userService.getAll();
      
      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('user1@plv.edu.ph');
      expect(users[1].role).toBe('admin');
    });

    it('should return empty array when no users exist', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const users = await userService.getAll();
      
      expect(users).toEqual([]);
    });
  });

  describe('updateUser', () => {
    it('should update user data', async () => {
      const { updateDoc, getDoc } = await import('firebase/firestore');
      const mockUpdate = vi.mocked(updateDoc);
      const mockGetDoc = vi.mocked(getDoc);
      
      mockUpdate.mockResolvedValue();
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user-123',
        data: () => ({
          email: 'test@plv.edu.ph',
          name: 'Updated Name',
          department: 'CS',
          role: 'faculty',
          status: 'approved',
        }),
      } as any);

      const result = await userService.update('user-123', {
        name: 'Updated Name',
        department: 'CS',
      });
      
      expect(result.name).toBe('Updated Name');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const { updateDoc } = await import('firebase/firestore');
      const mockUpdate = vi.mocked(updateDoc);
      
      mockUpdate.mockRejectedValue(new Error('Update failed'));

      await expect(
        userService.update('user-123', { name: 'Test' })
      ).rejects.toThrow();
    });
  });
});

describe('FirebaseService - Classroom Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllClassrooms', () => {
    it('should retrieve all classrooms', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'room-1',
            data: () => ({
              name: 'Room 101',
              capacity: 30,
              equipment: ['Projector'],
              building: 'Building A',
              floor: 1,
              isAvailable: true,
            }),
          },
        ],
      } as any);

      const classrooms = await classroomService.getAll();
      
      expect(classrooms).toHaveLength(1);
      expect(classrooms[0].name).toBe('Room 101');
      expect(classrooms[0].capacity).toBe(30);
    });
  });

  describe('createClassroom', () => {
    it('should create new classroom', async () => {
      const { addDoc } = await import('firebase/firestore');
      const mockAdd = vi.mocked(addDoc);
      
      mockAdd.mockResolvedValue({ id: 'new-room' } as any);

      const newClassroom: Omit<Classroom, 'id'> = {
        name: 'Room 202',
        capacity: 40,
        equipment: ['Computer', 'Projector'],
        building: 'Building B',
        floor: 2,
        isAvailable: true,
      };

      const result = await classroomService.create(newClassroom);
      
      expect(result.id).toBe('new-room');
      expect(result.name).toBe('Room 202');
      expect(mockAdd).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const { addDoc } = await import('firebase/firestore');
      const mockAdd = vi.mocked(addDoc);
      
      mockAdd.mockRejectedValue(new Error('Creation failed'));

      const newClassroom: Omit<Classroom, 'id'> = {
        name: 'Room 202',
        capacity: 40,
        equipment: [],
        building: 'Building B',
        floor: 2,
        isAvailable: true,
      };

      await expect(
        classroomService.create(newClassroom)
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('updateClassroom', () => {
    it('should update classroom data', async () => {
      const { updateDoc, getDoc } = await import('firebase/firestore');
      const mockUpdate = vi.mocked(updateDoc);
      const mockGetDoc = vi.mocked(getDoc);
      
      mockUpdate.mockResolvedValue();
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'room-1',
        data: () => ({
          name: 'Room 101',
          capacity: 50,
          equipment: ['Projector', 'Whiteboard'],
          building: 'Building A',
          floor: 1,
          isAvailable: true,
        }),
      } as any);

      const result = await classroomService.update('room-1', {
        capacity: 50,
        equipment: ['Projector', 'Whiteboard'],
      });
      
      expect(result.capacity).toBe(50);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('deleteClassroom', () => {
    it('should delete classroom', async () => {
      const { deleteDoc } = await import('firebase/firestore');
      const mockDelete = vi.mocked(deleteDoc);
      
      mockDelete.mockResolvedValue();

      await classroomService.delete('room-1');
      
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const { deleteDoc } = await import('firebase/firestore');
      const mockDelete = vi.mocked(deleteDoc);
      
      mockDelete.mockRejectedValue(new Error('Deletion failed'));

      await expect(
        classroomService.delete('room-1')
      ).rejects.toThrow('Deletion failed');
    });
  });

  describe('checkConflicts', () => {
    it('should return false when no conflicts exist', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      // No conflicting bookings
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const hasConflict = await bookingRequestService.checkConflicts(
        'room-1',
        '2025-11-07',
        '08:00',
        '10:00'
      );
      
      expect(hasConflict).toBe(false);
    });

    it('should return true when conflicts exist', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      // Conflicting booking exists
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'conflict-1',
            data: () => ({
              classroomId: 'room-1',
              date: '2025-11-07',
              startTime: '08:30',
              endTime: '10:30',
              status: 'approved',
            }),
          },
        ],
      } as any);

      const hasConflict = await bookingRequestService.checkConflicts(
        'room-1',
        '2025-11-07',
        '08:00',
        '10:00'
      );
      
      expect(hasConflict).toBe(true);
    });
  });
});

describe('FirebaseService - Booking Request Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create new booking request', async () => {
      const { addDoc } = await import('firebase/firestore');
      const mockAdd = vi.mocked(addDoc);
      
      mockAdd.mockResolvedValue({ id: 'request-123' } as any);

      const newRequest = {
        facultyId: 'faculty-1',
        facultyName: 'Test Faculty',
        classroomId: 'room-1',
        classroomName: 'Room 101',
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
      };

      const result = await bookingRequestService.create(newRequest);
      
      expect(result.id).toBe('request-123');
      expect(result.status).toBe('pending');
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update booking request status to approved', async () => {
      const { updateDoc, getDoc } = await import('firebase/firestore');
      const mockUpdate = vi.mocked(updateDoc);
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'request-1',
        data: () => ({
          facultyId: 'faculty-1',
          facultyName: 'Test Faculty',
          classroomId: 'room-1',
          classroomName: 'Room 101',
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          status: 'approved',
          requestDate: '2025-11-06T10:00:00',
        }),
      } as any);
      
      mockUpdate.mockResolvedValue();

      const result = await bookingRequestService.update('request-1', { status: 'approved' });
      
      expect(result.id).toBe('request-1');
      expect(result.status).toBe('approved');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update booking request status to rejected', async () => {
      const { updateDoc, getDoc } = await import('firebase/firestore');
      const mockUpdate = vi.mocked(updateDoc);
      const mockGetDoc = vi.mocked(getDoc);
      
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'request-1',
        data: () => ({
          facultyId: 'faculty-1',
          facultyName: 'Test Faculty',
          classroomId: 'room-1',
          classroomName: 'Room 101',
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          status: 'rejected',
          adminFeedback: 'Room unavailable',
          requestDate: '2025-11-06T10:00:00',
        }),
      } as any);
      
      mockUpdate.mockResolvedValue();

      const result = await bookingRequestService.update('request-1', { 
        status: 'rejected',
        adminFeedback: 'Room unavailable'
      });
      
      expect(result.status).toBe('rejected');
      expect(result.adminFeedback).toBe('Room unavailable');
      // Don't check the exact arguments - the service adds updatedAt and updatedBy
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('getRequestsByFaculty', () => {
    it('should retrieve requests for specific faculty', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'request-1',
            data: () => ({
              facultyId: 'faculty-1',
              status: 'pending',
              requestDate: '2025-11-06T10:00:00',
            }),
          },
        ],
      } as any);

      const requests = await bookingRequestService.getAllForFaculty('faculty-1');
      
      expect(requests).toHaveLength(1);
      expect(requests[0].facultyId).toBe('faculty-1');
    });
  });
});

describe('FirebaseService - Schedule Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSchedules', () => {
    it('should retrieve all schedules', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'schedule-1',
            data: () => ({
              classroomId: 'room-1',
              facultyId: 'faculty-1',
              date: '2025-11-07',
              startTime: '08:00',
              endTime: '10:00',
              status: 'confirmed',
            }),
          },
        ],
      } as any);

      const schedules = await scheduleService.getAll();
      
      expect(schedules).toHaveLength(1);
      expect(schedules[0].status).toBe('confirmed');
    });
  });

  describe('createSchedule', () => {
    it('should create new schedule', async () => {
      const { addDoc } = await import('firebase/firestore');
      const mockAdd = vi.mocked(addDoc);
      
      mockAdd.mockResolvedValue({ id: 'schedule-123' } as any);

      const newSchedule = {
        classroomId: 'room-1',
        classroomName: 'Room 101',
        facultyId: 'faculty-1',
        facultyName: 'Test Faculty',
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'confirmed' as const,
      };

      const result = await scheduleService.create(newSchedule);
      
      expect(result.id).toBe('schedule-123');
      expect(result.status).toBe('confirmed');
      expect(mockAdd).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete schedule', async () => {
      const { deleteDoc } = await import('firebase/firestore');
      const mockDelete = vi.mocked(deleteDoc);
      
      mockDelete.mockResolvedValue();

      await scheduleService.delete('schedule-1');
      
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('checkConflict', () => {
    it('should detect schedule conflicts', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [
          {
            id: 'conflict',
            data: () => ({
              classroomId: 'room-1',
              date: '2025-11-07',
              startTime: '08:30',
              endTime: '10:30',
            }),
          }
        ],
      } as any);

      const hasConflict = await scheduleService.checkConflict(
        'room-1',
        '2025-11-07',
        '08:00',
        '10:00'
      );
      
      expect(hasConflict).toBe(true);
    });

    it('should return false when no conflicts exist', async () => {
      const { getDocs } = await import('firebase/firestore');
      const mockGetDocs = vi.mocked(getDocs);
      
      mockGetDocs.mockResolvedValue({
        docs: [],
      } as any);

      const hasConflict = await scheduleService.checkConflict(
        'room-1',
        '2025-11-07',
        '08:00',
        '10:00'
      );
      
      expect(hasConflict).toBe(false);
    });
  });
});
