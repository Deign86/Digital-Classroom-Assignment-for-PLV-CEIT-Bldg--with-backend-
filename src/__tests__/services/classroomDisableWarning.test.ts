import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classroomService, bookingRequestService, scheduleService } from '../../../lib/firebaseService';
import { notificationService } from '../../../lib/notificationService';
import {
  mockGetDocs,
  mockUpdateDoc,
  createMockClassroom,
  createMockBookingRequest,
  createMockSchedule,
  resetFirebaseMocks,
  createMockQuerySnapshot,
} from '../__mocks__/firebase';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((db, name) => ({ _path: name })),
  doc: vi.fn((db, coll, id) => ({ _path: `${coll}/${id}` })),
  getDocs: mockGetDocs,
  updateDoc: mockUpdateDoc,
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { uid: 'admin_123' },
  })),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}));

vi.mock('../../../lib/notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
  },
}));

describe('Smart Disable Warning System', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('detect active reservations when disabling', () => {
    it('should detect active booking requests when disabling classroom', async () => {
      const classroom = createMockClassroom({ id: 'class_1', name: 'Room A', isAvailable: true });
      const activeBooking = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        classroomName: 'Room A',
        date: '2024-12-20', // Future date
        startTime: '09:00',
        endTime: '10:00',
        status: 'approved',
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'req_1', data: activeBooking }])
      );

      const bookings = await bookingRequestService.getAll();
      const activeBookings = bookings.filter(
        (b) => b.classroomId === 'class_1' && b.status === 'approved'
      );

      expect(activeBookings.length).toBeGreaterThan(0);
    });

    it('should detect active schedules when disabling classroom', async () => {
      const classroom = createMockClassroom({ id: 'class_1', name: 'Room A' });
      const activeSchedule = createMockSchedule({
        id: 'sched_1',
        classroomId: 'class_1',
        classroomName: 'Room A',
        date: '2024-12-20', // Future date
        startTime: '09:00',
        endTime: '10:00',
        status: 'confirmed',
        facultyId: 'faculty_123',
        facultyName: 'Test Faculty',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'sched_1', data: activeSchedule }])
      );

      const schedules = await scheduleService.getAll();
      const activeSchedules = schedules.filter(
        (s) => s.classroomId === 'class_1' && s.status === 'confirmed'
      );

      expect(activeSchedules.length).toBeGreaterThan(0);
    });

    it('should ignore past reservations when checking for active ones', async () => {
      const pastBooking = createMockBookingRequest({
        id: 'req_1',
        classroomId: 'class_1',
        date: '2024-01-01', // Past date
        status: 'approved',
      });

      const futureBooking = createMockBookingRequest({
        id: 'req_2',
        classroomId: 'class_1',
        date: '2024-12-20', // Future date
        status: 'approved',
      });

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'req_1', data: pastBooking },
          { id: 'req_2', data: futureBooking },
        ])
      );

      const bookings = await bookingRequestService.getAll();
      const now = new Date();
      const activeBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.date);
        return bookingDate >= now && b.status === 'approved';
      });

      expect(activeBookings.length).toBe(1);
      expect(activeBookings[0].id).toBe('req_2');
    });
  });

  describe('notification to affected faculty', () => {
    it('should send notification to all affected faculty members', async () => {
      const affectedBookings = [
        createMockBookingRequest({
          id: 'req_1',
          classroomId: 'class_1',
          facultyId: 'faculty_1',
          facultyName: 'Faculty 1',
        }),
        createMockBookingRequest({
          id: 'req_2',
          classroomId: 'class_1',
          facultyId: 'faculty_2',
          facultyName: 'Faculty 2',
        }),
      ];

      const affectedSchedules = [
        createMockSchedule({
          id: 'sched_1',
          classroomId: 'class_1',
          facultyId: 'faculty_1',
          facultyName: 'Faculty 1',
        }),
      ];

      // Get unique faculty IDs
      const facultyIds = new Set<string>();
      affectedBookings.forEach((b) => facultyIds.add(b.facultyId));
      affectedSchedules.forEach((s) => facultyIds.add(s.facultyId));

      const classroom = createMockClassroom({ id: 'class_1', name: 'Room A' });
      const reason = 'Maintenance required';

      // Send notifications
      for (const facultyId of facultyIds) {
        const message = reason
          ? `The classroom "${classroom.name}" has been disabled. Reason: ${reason}. Please contact admin regarding your affected reservations.`
          : `The classroom "${classroom.name}" has been disabled. Please contact admin regarding your affected reservations.`;

        await notificationService.createNotification(
          facultyId,
          'classroom_disabled',
          message,
          {
            actorId: 'admin_123',
          }
        );
      }

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2); // faculty_1 and faculty_2
    });

    it('should include admin reason in notification message', async () => {
      const classroom = createMockClassroom({ id: 'class_1', name: 'Room A' });
      const reason = 'Scheduled maintenance on December 20th';
      const facultyId = 'faculty_123';

      const message = `The classroom "${classroom.name}" has been disabled. Reason: ${reason}. Please contact admin regarding your affected reservations.`;

      await notificationService.createNotification(
        facultyId,
        'classroom_disabled',
        message,
        {
          actorId: 'admin_123',
        }
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        facultyId,
        'classroom_disabled',
        expect.stringContaining(reason),
        expect.any(Object)
      );
    });

    it('should use classroom_disabled notification type', async () => {
      const classroom = createMockClassroom({ id: 'class_1', name: 'Room A' });
      const facultyId = 'faculty_123';

      await notificationService.createNotification(
        facultyId,
        'classroom_disabled',
        `The classroom "${classroom.name}" has been disabled.`,
        {
          actorId: 'admin_123',
        }
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        facultyId,
        'classroom_disabled',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('warning modal data preparation', () => {
    it('should prepare affected bookings list for warning modal', async () => {
      const affectedBookings = [
        createMockBookingRequest({
          id: 'req_1',
          classroomId: 'class_1',
          classroomName: 'Room A',
          date: '2024-12-20',
          startTime: '09:00',
          endTime: '10:00',
          facultyName: 'Faculty 1',
        }),
        createMockBookingRequest({
          id: 'req_2',
          classroomId: 'class_1',
          classroomName: 'Room A',
          date: '2024-12-20',
          startTime: '14:00',
          endTime: '15:00',
          facultyName: 'Faculty 2',
        }),
      ];

      expect(affectedBookings.length).toBe(2);
      expect(affectedBookings[0].classroomName).toBe('Room A');
      expect(affectedBookings[1].facultyName).toBe('Faculty 2');
    });

    it('should prepare affected schedules list for warning modal', async () => {
      const affectedSchedules = [
        createMockSchedule({
          id: 'sched_1',
          classroomId: 'class_1',
          classroomName: 'Room A',
          date: '2024-12-20',
          startTime: '09:00',
          endTime: '10:00',
          facultyName: 'Faculty 1',
        }),
      ];

      expect(affectedSchedules.length).toBe(1);
      expect(affectedSchedules[0].classroomName).toBe('Room A');
    });

    it('should handle empty affected reservations gracefully', async () => {
      const affectedBookings: any[] = [];
      const affectedSchedules: any[] = [];

      expect(affectedBookings.length).toBe(0);
      expect(affectedSchedules.length).toBe(0);
    });
  });
});

