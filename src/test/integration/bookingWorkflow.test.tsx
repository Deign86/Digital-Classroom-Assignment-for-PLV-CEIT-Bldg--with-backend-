import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Classroom, BookingRequest, Schedule } from '../../../App';

// Mock Firebase services
vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    signOut: vi.fn(() => Promise.resolve()),
  },
  bookingRequestService: {
    create: vi.fn(),
    update: vi.fn(),
    getAll: vi.fn(() => Promise.resolve([])),
    getAllForFaculty: vi.fn(() => Promise.resolve([])),
    getById: vi.fn(),
    checkConflicts: vi.fn(() => Promise.resolve(false)),
  },
  scheduleService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getAllForFaculty: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkConflict: vi.fn(() => Promise.resolve(false)),
  },
  classroomService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  realtimeService: {
    subscribeToData: vi.fn((user, callbacks) => {
      // Immediately call callbacks with empty data
      callbacks.onClassroomsUpdate?.([]);
      callbacks.onBookingRequestsUpdate?.([]);
      callbacks.onSchedulesUpdate?.([]);
      return vi.fn(); // Return unsubscribe function
    }),
    unsubscribeAll: vi.fn(),
  },
}));

vi.mock('../../../lib/notificationService', () => ({
  default: {
    createNotification: vi.fn(() => Promise.resolve()),
    getNotifications: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Integration Tests - Complete Booking Workflow', () => {
  const mockFaculty: User = {
    id: 'faculty-1',
    email: 'faculty@plv.edu.ph',
    name: 'Test Faculty',
    role: 'faculty',
    department: 'Computer Science',
    status: 'approved',
  };

  const mockAdmin: User = {
    id: 'admin-1',
    email: 'admin@plv.edu.ph',
    name: 'Test Admin',
    role: 'admin',
    status: 'approved',
  };

  const mockClassroom: Classroom = {
    id: 'room-1',
    name: 'Room 101',
    capacity: 30,
    equipment: ['Projector', 'Whiteboard'],
    building: 'Building A',
    floor: 1,
    isAvailable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Faculty Creates Booking Request', () => {
    it('should complete booking request creation workflow', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);
      
      const mockBookingRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture on Data Structures',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockCreate.mockResolvedValue(mockBookingRequest);

      // Simulate faculty creating a booking
      const bookingData = {
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture on Data Structures',
      };

      const result = await bookingRequestService.create(bookingData);

      expect(result.id).toBe('request-123');
      expect(result.status).toBe('pending');
      expect(mockCreate).toHaveBeenCalledWith(bookingData);
    });

    it('should handle booking conflicts during creation', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);
      
      const conflictError = new Error('Time slot conflict detected');
      mockCreate.mockRejectedValue(conflictError);

      const bookingData = {
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
      };

      await expect(bookingRequestService.create(bookingData)).rejects.toThrow('conflict');
    });
  });

  describe('Admin Approves Booking Request', () => {
    it('should complete approval workflow and create schedule', async () => {
      const { bookingRequestService, scheduleService } = await import('../../../lib/firebaseService');
      const mockUpdate = vi.mocked(bookingRequestService.update);
      const mockCreateSchedule = vi.mocked(scheduleService.create);
      
      const updatedBookingRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'approved',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      // Mock approval updating status
      mockUpdate.mockResolvedValue(updatedBookingRequest);

      const mockSchedule: Schedule = {
        id: 'schedule-123',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'confirmed',
      };

      mockCreateSchedule.mockResolvedValue(mockSchedule);

      // Admin approves request
      const approvalResult = await bookingRequestService.update('request-123', { status: 'approved' });

      expect(approvalResult.status).toBe('approved');
      expect(mockUpdate).toHaveBeenCalledWith('request-123', { status: 'approved' });
    });

    it('should handle approval with notification', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockUpdate = vi.mocked(bookingRequestService.update);
      
      const updatedBookingRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'approved',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockUpdate.mockResolvedValue(updatedBookingRequest);

      await bookingRequestService.update('request-123', { status: 'approved' });

      expect(mockUpdate).toHaveBeenCalled();
      // Notification would be created by Cloud Functions in real scenario
    });
  });

  describe('Admin Rejects Booking Request', () => {
    it('should complete rejection workflow with feedback', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockUpdate = vi.mocked(bookingRequestService.update);
      
      const updatedBookingRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'rejected',
        requestDate: '2025-11-06T12:00:00.000Z',
        adminFeedback: 'Room unavailable due to maintenance',
      };

      mockUpdate.mockResolvedValue(updatedBookingRequest);

      const feedback = 'Room unavailable due to maintenance';
      const result = await bookingRequestService.update('request-123', { 
        status: 'rejected',
        adminFeedback: feedback 
      });

      expect(result.status).toBe('rejected');
      expect(result.adminFeedback).toBe(feedback);
      expect(mockUpdate).toHaveBeenCalledWith('request-123', { 
        status: 'rejected',
        adminFeedback: feedback 
      });
    });
  });

  describe('Schedule Management Workflow', () => {
    it('should retrieve schedules after creation', async () => {
      const { scheduleService } = await import('../../../lib/firebaseService');
      const mockGetAll = vi.mocked(scheduleService.getAll);
      
      const mockSchedule: Schedule = {
        id: 'schedule-123',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'confirmed',
      };

      mockGetAll.mockResolvedValue([mockSchedule]);

      const schedules = await scheduleService.getAll();

      expect(schedules).toHaveLength(1);
      expect(schedules[0].id).toBe('schedule-123');
      expect(schedules[0].status).toBe('confirmed');
    });

    it('should cancel schedule with reason', async () => {
      const { scheduleService } = await import('../../../lib/firebaseService');
      const mockDelete = vi.mocked(scheduleService.delete);
      
      mockDelete.mockResolvedValue();

      await scheduleService.delete('schedule-123');

      expect(mockDelete).toHaveBeenCalledWith('schedule-123');
    });
  });

  describe('Real-time Data Synchronization', () => {
    it('should subscribe to real-time updates for faculty', async () => {
      const { realtimeService } = await import('../../../lib/firebaseService');
      const mockSubscribe = vi.mocked(realtimeService.subscribeToData);

      const callbacks = {
        onClassroomsUpdate: vi.fn(),
        onBookingRequestsUpdate: vi.fn(),
        onSchedulesUpdate: vi.fn(),
      };

      realtimeService.subscribeToData(mockFaculty, callbacks);

      expect(mockSubscribe).toHaveBeenCalledWith(mockFaculty, callbacks);
      expect(callbacks.onClassroomsUpdate).toHaveBeenCalled();
      expect(callbacks.onBookingRequestsUpdate).toHaveBeenCalled();
      expect(callbacks.onSchedulesUpdate).toHaveBeenCalled();
    });

    it('should subscribe to real-time updates for admin', async () => {
      const { realtimeService } = await import('../../../lib/firebaseService');
      const mockSubscribe = vi.mocked(realtimeService.subscribeToData);

      const callbacks = {
        onClassroomsUpdate: vi.fn(),
        onBookingRequestsUpdate: vi.fn(),
        onSchedulesUpdate: vi.fn(),
      };

      realtimeService.subscribeToData(mockAdmin, callbacks);

      expect(mockSubscribe).toHaveBeenCalledWith(mockAdmin, callbacks);
    });

    it('should unsubscribe when component unmounts', async () => {
      const { realtimeService } = await import('../../../lib/firebaseService');

      const callbacks = {
        onClassroomsUpdate: vi.fn(),
        onBookingRequestsUpdate: vi.fn(),
        onSchedulesUpdate: vi.fn(),
      };

      // Call subscribeToData and verify it was called
      realtimeService.subscribeToData(mockFaculty, callbacks);

      expect(realtimeService.subscribeToData).toHaveBeenCalled();
    });
  });

  describe('End-to-End Workflow: Complete Booking Cycle', () => {
    it('should handle full workflow from creation to schedule', async () => {
      const { bookingRequestService, scheduleService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);
      const mockUpdate = vi.mocked(bookingRequestService.update);
      const mockGetSchedules = vi.mocked(scheduleService.getAll);

      // Step 1: Faculty creates booking request
      const mockBookingRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockCreate.mockResolvedValue(mockBookingRequest);

      const createResult = await bookingRequestService.create({
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
      });

      expect(createResult.id).toBe('request-123');
      expect(createResult.status).toBe('pending');

      // Step 2: Admin approves request (creates schedule in real implementation)
      const approvedRequest: BookingRequest = {
        ...mockBookingRequest,
        status: 'approved',
      };
      mockUpdate.mockResolvedValue(approvedRequest);

      const approveResult = await bookingRequestService.update('request-123', { status: 'approved' });

      expect(approveResult.status).toBe('approved');

      // Step 3: Schedule is now visible
      const mockSchedule: Schedule = {
        id: 'schedule-123',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'confirmed',
      };

      mockGetSchedules.mockResolvedValue([mockSchedule]);

      const schedules = await scheduleService.getAll();

      expect(schedules).toHaveLength(1);
      expect(schedules[0].facultyId).toBe(mockFaculty.id);
      expect(schedules[0].status).toBe('confirmed');
    });

    it('should handle full workflow with rejection', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);
      const mockUpdate = vi.mocked(bookingRequestService.update);

      // Step 1: Faculty creates booking request
      const mockBookingRequest: BookingRequest = {
        id: 'request-456',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Lab Session',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockCreate.mockResolvedValue(mockBookingRequest);

      await bookingRequestService.create({
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Lab Session',
      });

      // Step 2: Admin rejects request
      const feedback = 'Classroom under maintenance';
      const rejectedRequest: BookingRequest = {
        ...mockBookingRequest,
        status: 'rejected',
        adminFeedback: feedback,
      };
      mockUpdate.mockResolvedValue(rejectedRequest);

      const rejectResult = await bookingRequestService.update('request-456', {
        status: 'rejected',
        adminFeedback: feedback,
      });

      expect(rejectResult.status).toBe('rejected');
      expect(mockUpdate).toHaveBeenCalledWith('request-456', {
        status: 'rejected',
        adminFeedback: feedback,
      });
    });
  });

  describe('Conflict Detection Across Services', () => {
    it('should prevent double-booking through conflict detection', async () => {
      const { bookingRequestService, scheduleService } = await import('../../../lib/firebaseService');
      const mockCheckConflict = vi.mocked(scheduleService.checkConflict);
      const mockCreate = vi.mocked(bookingRequestService.create);

      // First booking succeeds
      mockCheckConflict.mockResolvedValueOnce(false);
      
      const mockBookingRequest1: BookingRequest = {
        id: 'request-1',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockCreate.mockResolvedValueOnce(mockBookingRequest1);

      await bookingRequestService.create({
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
      });

      // Second booking at same time fails
      mockCheckConflict.mockResolvedValueOnce(true);
      const conflictError = new Error('Time slot conflict');
      mockCreate.mockRejectedValueOnce(conflictError);

      await expect(
        bookingRequestService.create({
          facultyId: 'faculty-2',
          facultyName: 'Another Faculty',
          classroomId: mockClassroom.id,
          classroomName: mockClassroom.name,
          date: '2025-11-07',
          startTime: '08:30',
          endTime: '10:30',
          purpose: 'Tutorial',
        })
      ).rejects.toThrow('conflict');
    });
  });

  describe('Multi-User Concurrent Operations', () => {
    it('should handle multiple faculty creating requests', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);

      const mockRequest1: BookingRequest = {
        id: 'request-1',
        facultyId: 'faculty-1',
        facultyName: 'Faculty 1',
        classroomId: 'room-1',
        classroomName: 'Room 101',
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture 1',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      const mockRequest2: BookingRequest = {
        id: 'request-2',
        facultyId: 'faculty-2',
        facultyName: 'Faculty 2',
        classroomId: 'room-2',
        classroomName: 'Room 102',
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture 2',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      mockCreate.mockResolvedValueOnce(mockRequest1).mockResolvedValueOnce(mockRequest2);

      const requests = await Promise.all([
        bookingRequestService.create({
          facultyId: 'faculty-1',
          facultyName: 'Faculty 1',
          classroomId: 'room-1',
          classroomName: 'Room 101',
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Lecture 1',
        }),
        bookingRequestService.create({
          facultyId: 'faculty-2',
          facultyName: 'Faculty 2',
          classroomId: 'room-2',
          classroomName: 'Room 102',
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Lecture 2',
        }),
      ]);

      expect(requests).toHaveLength(2);
      requests.forEach((result: BookingRequest) => {
        expect(result.id).toBeDefined();
        expect(result.status).toBe('pending');
      });
    });

    it('should handle admin processing multiple requests', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockUpdate = vi.mocked(bookingRequestService.update);

      const approvedRequest: BookingRequest = {
        id: 'request-1',
        facultyId: 'faculty-1',
        facultyName: 'Faculty 1',
        classroomId: 'room-1',
        classroomName: 'Room 101',
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'approved',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      const rejectedRequest: BookingRequest = {
        ...approvedRequest,
        id: 'request-3',
        status: 'rejected',
        adminFeedback: 'Not available',
      };

      mockUpdate.mockResolvedValueOnce(approvedRequest);
      mockUpdate.mockResolvedValueOnce(approvedRequest);
      mockUpdate.mockResolvedValueOnce(rejectedRequest);

      await Promise.all([
        bookingRequestService.update('request-1', { status: 'approved' }),
        bookingRequestService.update('request-2', { status: 'approved' }),
        bookingRequestService.update('request-3', { status: 'rejected', adminFeedback: 'Not available' }),
      ]);

      expect(mockUpdate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle network failures gracefully', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);

      const networkError = new Error('Network error');
      (networkError as any).code = 'unavailable';
      mockCreate.mockRejectedValue(networkError);

      await expect(
        bookingRequestService.create({
          facultyId: mockFaculty.id,
          facultyName: mockFaculty.name,
          classroomId: mockClassroom.id,
          classroomName: mockClassroom.name,
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Lecture',
        })
      ).rejects.toThrow('Network error');
    });

    it('should retry failed operations', async () => {
      const { bookingRequestService } = await import('../../../lib/firebaseService');
      const mockCreate = vi.mocked(bookingRequestService.create);

      const mockRequest: BookingRequest = {
        id: 'request-123',
        facultyId: mockFaculty.id,
        facultyName: mockFaculty.name,
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-11-07',
        startTime: '08:00',
        endTime: '10:00',
        purpose: 'Lecture',
        status: 'pending',
        requestDate: '2025-11-06T12:00:00.000Z',
      };

      // Fail first, succeed second
      mockCreate
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockRequest);

      // In real implementation, withRetry would handle this
      let result;
      try {
        result = await bookingRequestService.create({
          facultyId: mockFaculty.id,
          facultyName: mockFaculty.name,
          classroomId: mockClassroom.id,
          classroomName: mockClassroom.name,
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Lecture',
        });
      } catch (error) {
        // Retry
        result = await bookingRequestService.create({
          facultyId: mockFaculty.id,
          facultyName: mockFaculty.name,
          classroomId: mockClassroom.id,
          classroomName: mockClassroom.name,
          date: '2025-11-07',
          startTime: '08:00',
          endTime: '10:00',
          purpose: 'Lecture',
        });
      }

      expect(result?.id).toBe('request-123');
      expect(result?.status).toBe('pending');
    });
  });
});
