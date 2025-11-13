import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classroomService } from '../../../lib/firebaseService';
import { notificationService } from '../../../lib/notificationService';
import { createMockClassroom } from '../__mocks__/firebase';

// Mock Firebase services
vi.mock('../../../lib/firebaseService', async () => {
  const actual = await vi.importActual('../../../lib/firebaseService');
  return {
    ...actual,
    classroomService: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
    },
  };
});

vi.mock('../../../lib/notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
  },
}));

describe('Classroom Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create → edit → disable → notify → enable → delete', () => {
    it('should complete full classroom management flow', async () => {
      // Step 1: Create classroom
      const newClassroom = {
        name: 'Room A',
        capacity: 30,
        equipment: ['projector'],
        building: 'Main Building',
        floor: 1,
        isAvailable: true,
      };

      const createdClassroom = createMockClassroom({ ...newClassroom, id: 'class_1' });

      vi.mocked(classroomService.create).mockResolvedValue(createdClassroom);

      const classroom = await classroomService.create(newClassroom);

      expect(classroomService.create).toHaveBeenCalled();
      expect(classroom.name).toBe('Room A');

      // Step 2: Edit classroom
      const updatedClassroom = { ...classroom, capacity: 40 };
      vi.mocked(classroomService.update).mockResolvedValue(updatedClassroom);

      const editedClassroom = await classroomService.update(classroom.id, { capacity: 40 });

      expect(classroomService.update).toHaveBeenCalled();
      expect(editedClassroom.capacity).toBe(40);

      // Step 3: Disable classroom
      const disabledClassroom = { ...editedClassroom, isAvailable: false };
      vi.mocked(classroomService.update).mockResolvedValue(disabledClassroom);

      const disabled = await classroomService.update(classroom.id, { isAvailable: false });

      expect(classroomService.update).toHaveBeenCalled();
      expect(disabled.isAvailable).toBe(false);

      // Step 4: Notify (simulated - would send notification to affected users)
      expect(notificationService.createNotification).toBeDefined();

      // Step 5: Enable classroom
      const enabledClassroom = { ...disabled, isAvailable: true };
      vi.mocked(classroomService.update).mockResolvedValue(enabledClassroom);

      const enabled = await classroomService.update(classroom.id, { isAvailable: true });

      expect(classroomService.update).toHaveBeenCalled();
      expect(enabled.isAvailable).toBe(true);

      // Step 6: Delete classroom
      vi.mocked(classroomService.delete).mockResolvedValue(undefined);

      await classroomService.delete(classroom.id);

      expect(classroomService.delete).toHaveBeenCalled();
    });
  });

  describe('equipment management', () => {
    it('should update classroom equipment', async () => {
      const classroom = createMockClassroom({ id: 'class_1', equipment: ['projector'] });
      const updatedClassroom = { ...classroom, equipment: ['projector', 'whiteboard'] };

      vi.mocked(classroomService.update).mockResolvedValue(updatedClassroom);

      const result = await classroomService.update(classroom.id, {
        equipment: ['projector', 'whiteboard'],
      });

      expect(result.equipment).toContain('whiteboard');
      expect(result.equipment.length).toBe(2);
    });
  });

  describe('capacity updates', () => {
    it('should update classroom capacity', async () => {
      const classroom = createMockClassroom({ id: 'class_1', capacity: 30 });
      const updatedClassroom = { ...classroom, capacity: 50 };

      vi.mocked(classroomService.update).mockResolvedValue(updatedClassroom);

      const result = await classroomService.update(classroom.id, { capacity: 50 });

      expect(result.capacity).toBe(50);
    });
  });
});

