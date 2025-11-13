import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bookingRequestService } from '../../../lib/firebaseService';
import {
  mockGetDocs,
  mockGetDoc,
  mockAddDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockHttpsCallable,
  createMockBookingRequest,
  resetFirebaseMocks,
} from '../__mocks__/firebase';
import { getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, collection, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createMockQuerySnapshot, createMockDocSnapshot } from '../__mocks__/firebase';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((db, name) => ({ _path: name })),
  doc: vi.fn((db, coll, id) => ({ _path: `${coll}/${id}` })),
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}));

vi.mock('../../../lib/notificationService', () => ({
  default: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
  },
}));

describe('bookingRequestService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new booking request successfully', async () => {
      const requestData = {
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
        classroomId: 'class_1',
        classroomName: 'Room A',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Lecture',
      };

      mockAddDoc.mockResolvedValue({ id: 'new-req-id' } as any);

      const result = await bookingRequestService.create(requestData);

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('new-req-id');
      expect(result.status).toBe('pending');
      expect(result.facultyId).toBe('faculty_123');
    });

    it('should handle errors when creating booking request', async () => {
      const requestData = {
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
        classroomId: 'class_1',
        classroomName: 'Room A',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Lecture',
      };

      mockAddDoc.mockRejectedValue(new Error('Network error'));

      await expect(bookingRequestService.create(requestData)).rejects.toThrow();
    });
  });

  describe('checkConflicts', () => {
    it('should return true when conflicts exist', async () => {
      const existingRequest = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'req_1', data: existingRequest }])
      );

      const hasConflict = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(true);
    });

    it('should return false when no conflicts exist', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const hasConflict = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(false);
    });

    it('should exclude specified request ID from conflict check', async () => {
      const existingRequest = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'req_1', data: existingRequest }])
      );

      const hasConflict = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00',
        'req_1'
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('approve', () => {
    it('should approve a booking request', async () => {
      const request = createMockBookingRequest({ id: 'req_1', status: 'pending' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('req_1', request));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await bookingRequestService.update('req_1', { status: 'approved' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.status).toBe('approved');
    });
  });

  describe('reject', () => {
    it('should reject a booking request with feedback', async () => {
      const request = createMockBookingRequest({ id: 'req_1', status: 'pending' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('req_1', request));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await bookingRequestService.update('req_1', {
        status: 'rejected',
        adminFeedback: 'Room unavailable',
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.status).toBe('rejected');
    });
  });

  describe('cancel', () => {
    it('should cancel a booking request', async () => {
      const request = createMockBookingRequest({ id: 'req_1', status: 'approved' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('req_1', request));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await bookingRequestService.update('req_1', { status: 'cancelled' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
    });
  });

  describe('getAll', () => {
    it('should retrieve all booking requests', async () => {
      const requests = [
        createMockBookingRequest({ id: 'req_1', status: 'pending' }),
        createMockBookingRequest({ id: 'req_2', status: 'approved' }),
      ];

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'req_1', data: requests[0] },
          { id: 'req_2', data: requests[1] },
        ])
      );

      const result = await bookingRequestService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('req_1');
    });
  });

  describe('getAllForFaculty', () => {
    it('should retrieve booking requests for specific faculty', async () => {
      const request = createMockBookingRequest({ facultyId: 'faculty_123' });
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([{ id: 'req_1', data: request }]));

      const result = await bookingRequestService.getAllForFaculty('faculty_123');

      expect(result).toHaveLength(1);
      expect(result[0].facultyId).toBe('faculty_123');
    });
  });

  describe('getById', () => {
    it('should retrieve booking request by id', async () => {
      const request = createMockBookingRequest({ id: 'req_1' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('req_1', request));

      const result = await bookingRequestService.getById('req_1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('req_1');
    });
  });

  describe('delete', () => {
    it('should delete booking request successfully', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await bookingRequestService.delete('req_1');

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('bulkUpdate', () => {
    it('should bulk update multiple booking requests', async () => {
      const updates = [
        { id: 'req_1', data: { status: 'approved' as const } },
        { id: 'req_2', data: { status: 'rejected' as const } },
      ];

      mockGetDoc.mockResolvedValue(
        createMockDocSnapshot('req_1', createMockBookingRequest({ id: 'req_1' }))
      );
      mockUpdateDoc.mockResolvedValue(undefined);

      await bookingRequestService.bulkUpdate(updates);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('cancelWithCallable', () => {
    it('should cancel booking request via callable', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { success: true } });

      await bookingRequestService.cancelWithCallable('req_1');

      expect(mockHttpsCallable).toHaveBeenCalled();
    });

    it('should handle errors when canceling via callable', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Callable error'));

      await expect(bookingRequestService.cancelWithCallable('req_1')).rejects.toThrow();
    });
  });

  describe('checkConflicts edge cases', () => {
    it('should detect overlapping time ranges correctly', async () => {
      const existingRequest = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved',
      });

      // Overlapping start time
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([{ id: 'req_1', data: existingRequest }])
      );
      const hasConflict1 = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:30',
        '10:30'
      );
      expect(hasConflict1).toBe(true);

      // Overlapping end time
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([{ id: 'req_1', data: existingRequest }])
      );
      const hasConflict2 = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '08:00',
        '09:30'
      );
      expect(hasConflict2).toBe(true);

      // Completely contained
      mockGetDocs.mockResolvedValueOnce(
        createMockQuerySnapshot([{ id: 'req_1', data: existingRequest }])
      );
      const hasConflict3 = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '08:00',
        '11:00'
      );
      expect(hasConflict3).toBe(true);
    });

    it('should ignore cancelled requests in conflict check', async () => {
      const cancelledRequest = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'cancelled',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'req_1', data: cancelledRequest }])
      );

      const hasConflict = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('bulkUpdate edge cases', () => {
    it('should handle empty updates array', async () => {
      await expect(bookingRequestService.bulkUpdate([])).resolves.not.toThrow();
    });

    it('should handle bulk update with mixed statuses', async () => {
      const updates = [
        { id: 'req_1', data: { status: 'approved' as const } },
        { id: 'req_2', data: { status: 'rejected' as const, adminFeedback: 'Reason' } },
      ];

      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnapshot('req_1', createMockBookingRequest({ id: 'req_1' })))
        .mockResolvedValueOnce(createMockDocSnapshot('req_2', createMockBookingRequest({ id: 'req_2' })));
      mockUpdateDoc.mockResolvedValue(undefined);

      await bookingRequestService.bulkUpdate(updates);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network request failed'));

      await expect(
        bookingRequestService.checkConflicts('class_1', '2024-01-15', '09:00', '10:00')
      ).rejects.toThrow();
    });

    it('should handle missing document errors', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await bookingRequestService.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors when updating non-existent request', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(
        bookingRequestService.update('non-existent', { status: 'approved' })
      ).rejects.toThrow();
    });

    it('should handle errors when creating request fails', async () => {
      mockAddDoc.mockRejectedValue(new Error('Permission denied'));

      await expect(
        bookingRequestService.create({
          facultyId: 'faculty_123',
          facultyName: 'Test Faculty',
          classroomId: 'class_1',
          classroomName: 'Room A',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          purpose: 'Lecture',
        })
      ).rejects.toThrow();
    });

    it('should handle errors when deleting request fails', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(bookingRequestService.delete('req_1')).rejects.toThrow();
    });
  });
});

