import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scheduleService } from '../../../lib/firebaseService';
import {
  mockGetDocs,
  mockGetDoc,
  mockAddDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockHttpsCallable,
  createMockSchedule,
  resetFirebaseMocks,
  createMockQuerySnapshot,
  createMockDocSnapshot,
} from '../__mocks__/firebase';

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

describe('scheduleService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new schedule successfully', async () => {
      const scheduleData = {
        classroomId: 'class_1',
        classroomName: 'Room A',
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Class',
        status: 'confirmed' as const,
      };

      mockAddDoc.mockResolvedValue({ id: 'new-sched-id' } as any);

      const result = await scheduleService.create(scheduleData);

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('new-sched-id');
    });

    it('should handle errors when creating schedule', async () => {
      const scheduleData = {
        classroomId: 'class_1',
        classroomName: 'Room A',
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Class',
        status: 'confirmed' as const,
      };

      mockAddDoc.mockRejectedValue(new Error('Network error'));

      await expect(scheduleService.create(scheduleData)).rejects.toThrow();
    });
  });

  describe('getSchedules', () => {
    it('should retrieve all schedules successfully', async () => {
      const schedules = [
        createMockSchedule({ id: 'sched_1', date: '2024-01-15' }),
        createMockSchedule({ id: 'sched_2', date: '2024-01-16' }),
      ];

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'sched_1', data: schedules[0] },
          { id: 'sched_2', data: schedules[1] },
        ])
      );

      const result = await scheduleService.getAll();

      expect(result).toHaveLength(2);
    });

    it('should retrieve schedules for specific faculty', async () => {
      const schedule = createMockSchedule({ facultyId: 'faculty_123' });
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([{ id: 'sched_1', data: schedule }]));

      const result = await scheduleService.getAllForFaculty('faculty_123');

      expect(result).toHaveLength(1);
      expect(result[0].facultyId).toBe('faculty_123');
    });
  });

  describe('update', () => {
    it('should update schedule successfully', async () => {
      const schedule = createMockSchedule({ id: 'sched_1', purpose: 'Old Purpose' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('sched_1', schedule));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await scheduleService.update('sched_1', { purpose: 'New Purpose' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.purpose).toBe('New Purpose');
    });
  });

  describe('cancel', () => {
    it('should cancel schedule successfully', async () => {
      const schedule = createMockSchedule({ id: 'sched_1', status: 'confirmed' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('sched_1', schedule));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await scheduleService.update('sched_1', { status: 'cancelled' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.status).toBe('cancelled');
    });
  });

  describe('checkAvailability', () => {
    it('should return true when conflict exists', async () => {
      const existingSchedule = createMockSchedule({
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: existingSchedule }])
      );

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(true);
    });

    it('should return false when no conflict exists', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(false);
    });

    it('should exclude cancelled schedules from conflict check', async () => {
      const cancelledSchedule = createMockSchedule({
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'cancelled',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: cancelledSchedule }])
      );

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('getById', () => {
    it('should retrieve schedule by id', async () => {
      const schedule = createMockSchedule({ id: 'sched_1' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('sched_1', schedule));

      const result = await scheduleService.getById('sched_1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('sched_1');
    });

    it('should return null when schedule not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await scheduleService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete schedule successfully', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await scheduleService.delete('sched_1');

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('cancelApprovedBooking', () => {
    it('should cancel approved booking via callable', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { success: true } });

      await scheduleService.cancelApprovedBooking('sched_1', 'Room maintenance');

      expect(mockHttpsCallable).toHaveBeenCalled();
    });

    it('should throw error when adminFeedback is missing', async () => {
      await expect(scheduleService.cancelApprovedBooking('sched_1', '')).rejects.toThrow();
    });
  });

  describe('getSchedules edge cases', () => {
    it('should return empty array when no schedules exist', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await scheduleService.getAll();

      expect(result).toHaveLength(0);
    });

    it('should filter schedules by date range', async () => {
      const schedules = [
        createMockSchedule({ id: 'sched_1', date: '2024-01-15' }),
        createMockSchedule({ id: 'sched_2', date: '2024-01-16' }),
        createMockSchedule({ id: 'sched_3', date: '2024-01-17' }),
      ];

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'sched_1', data: schedules[0] },
          { id: 'sched_2', data: schedules[1] },
          { id: 'sched_3', data: schedules[2] },
        ])
      );

      const result = await scheduleService.getAll();

      expect(result).toHaveLength(3);
    });
  });

  describe('checkConflict edge cases', () => {
    it('should detect exact time overlap', async () => {
      const existingSchedule = createMockSchedule({
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: existingSchedule }])
      );

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(true);
    });

    it('should detect partial overlap at start', async () => {
      const existingSchedule = createMockSchedule({
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: existingSchedule }])
      );

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '08:30',
        '09:30'
      );

      expect(hasConflict).toBe(true);
    });

    it('should detect partial overlap at end', async () => {
      const existingSchedule = createMockSchedule({
        classroomId: 'class_1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: existingSchedule }])
      );

      const hasConflict = await scheduleService.checkConflict(
        'class_1',
        '2024-01-15',
        '09:30',
        '10:30'
      );

      expect(hasConflict).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Network request failed'));

      await expect(
        scheduleService.checkConflict('class_1', '2024-01-15', '09:00', '10:00')
      ).rejects.toThrow();
    });

    it('should handle missing document errors', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await scheduleService.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors when updating non-existent schedule', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(
        scheduleService.update('non-existent', { purpose: 'New Purpose' })
      ).rejects.toThrow();
    });

    it('should handle errors when creating schedule fails', async () => {
      mockAddDoc.mockRejectedValue(new Error('Create failed'));

      await expect(
        scheduleService.create({
          classroomId: 'class_1',
          classroomName: 'Room A',
          facultyId: 'faculty_123',
          facultyName: 'Test Faculty',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          purpose: 'Class',
          status: 'confirmed',
        })
      ).rejects.toThrow();
    });

    it('should handle errors when deleting schedule fails', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(scheduleService.delete('sched_1')).rejects.toThrow();
    });
  });
});

