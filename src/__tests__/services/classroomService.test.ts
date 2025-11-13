import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classroomService } from '../../../lib/firebaseService';
import {
  mockGetDocs,
  mockGetDoc,
  mockAddDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  createMockClassroom,
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

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}));

describe('classroomService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new classroom successfully', async () => {
      const classroomData = {
        name: 'Room A',
        capacity: 30,
        equipment: ['projector', 'whiteboard'],
        building: 'Main Building',
        floor: 1,
        isAvailable: true,
      };

      mockAddDoc.mockResolvedValue({ id: 'new-class-id' } as any);

      const result = await classroomService.create(classroomData);

      expect(mockAddDoc).toHaveBeenCalled();
      expect(result.id).toBe('new-class-id');
      expect(result.name).toBe('Room A');
    });

    it('should handle errors when creating classroom', async () => {
      const classroomData = {
        name: 'Room A',
        capacity: 30,
        equipment: [],
        building: 'Main Building',
        floor: 1,
        isAvailable: true,
      };

      mockAddDoc.mockRejectedValue(new Error('Network error'));

      await expect(classroomService.create(classroomData)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update classroom successfully', async () => {
      const classroom = createMockClassroom({ id: 'class_1', capacity: 30 });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', { capacity: 40 });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.capacity).toBe(40);
    });

    it('should update classroom equipment', async () => {
      const classroom = createMockClassroom({ id: 'class_1', equipment: ['projector'] });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', {
        equipment: ['projector', 'whiteboard'],
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.equipment).toContain('whiteboard');
    });
  });

  describe('disable', () => {
    it('should disable classroom successfully', async () => {
      const classroom = createMockClassroom({ id: 'class_1', isAvailable: true });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', { isAvailable: false });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('enable', () => {
    it('should enable classroom successfully', async () => {
      const classroom = createMockClassroom({ id: 'class_1', isAvailable: false });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', { isAvailable: true });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.isAvailable).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete classroom successfully', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));
      mockDeleteDoc.mockResolvedValue(undefined);

      await classroomService.delete('class_1');

      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should retrieve classroom by id', async () => {
      const classroom = createMockClassroom({ id: 'class_1' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));

      const result = await classroomService.getById('class_1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('class_1');
    });

    it('should return null when classroom not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await classroomService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAvailableClassrooms', () => {
    it('should retrieve available classrooms', async () => {
      const classrooms = [
        createMockClassroom({ id: 'class_1', isAvailable: true }),
        createMockClassroom({ id: 'class_2', isAvailable: true }),
        createMockClassroom({ id: 'class_3', isAvailable: false }),
      ];

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'class_1', data: classrooms[0] },
          { id: 'class_2', data: classrooms[1] },
          { id: 'class_3', data: classrooms[2] },
        ])
      );

      const result = await classroomService.getAll();
      const available = result.filter((c) => c.isAvailable);

      expect(available.length).toBeGreaterThan(0);
    });
  });

  describe('bulkUpdate', () => {
    it('should bulk update multiple classrooms', async () => {
      const updates = [
        { id: 'class_1', data: { isAvailable: false } },
        { id: 'class_2', data: { capacity: 50 } },
      ];

      mockUpdateDoc.mockResolvedValue(undefined);

      await classroomService.bulkUpdate(updates);

      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });

  describe('getAll edge cases', () => {
    it('should return empty array when no classrooms exist', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await classroomService.getAll();

      expect(result).toHaveLength(0);
    });

    it('should handle large classroom lists', async () => {
      const classrooms = Array.from({ length: 50 }, (_, i) =>
        createMockClassroom({ id: `class_${i}`, name: `Room ${i}` })
      );

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot(classrooms.map((c, i) => ({ id: `class_${i}`, data: c })))
      );

      const result = await classroomService.getAll();

      expect(result).toHaveLength(50);
    });
  });

  describe('update edge cases', () => {
    it('should handle updating multiple fields at once', async () => {
      const classroom = createMockClassroom({
        id: 'class_1',
        capacity: 30,
        equipment: ['projector'],
        building: 'Main',
      });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', {
        capacity: 50,
        equipment: ['projector', 'whiteboard', 'smartboard'],
        building: 'New Building',
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.capacity).toBe(50);
    });

    it('should handle updating floor and building', async () => {
      const classroom = createMockClassroom({ id: 'class_1', floor: 1, building: 'Main' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('class_1', classroom));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await classroomService.update('class_1', {
        floor: 2,
        building: 'New Building',
      });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.floor).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle errors when updating non-existent classroom', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(
        classroomService.update('non-existent', { capacity: 40 })
      ).rejects.toThrow();
    });

    it('should handle errors when creating classroom fails', async () => {
      mockAddDoc.mockRejectedValue(new Error('Create failed'));

      await expect(
        classroomService.create({
          name: 'Room A',
          capacity: 30,
          equipment: [],
          building: 'Main Building',
          floor: 1,
          isAvailable: true,
        })
      ).rejects.toThrow();
    });

    it('should handle errors when deleting classroom fails', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(classroomService.delete('class_1')).rejects.toThrow();
    });

    it('should handle errors when getting classroom by id fails', async () => {
      mockGetDoc.mockRejectedValue(new Error('Get failed'));

      await expect(classroomService.getById('class_1')).rejects.toThrow();
    });
  });
});

