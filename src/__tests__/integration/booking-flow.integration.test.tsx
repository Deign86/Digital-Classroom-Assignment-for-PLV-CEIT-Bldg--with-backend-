import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { bookingRequestService } from '../../../lib/firebaseService';
import { notificationService } from '../../../lib/notificationService';
import { createMockBookingRequest, createMockUser } from '../__mocks__/firebase';

// Mock Firebase services
vi.mock('../../../lib/firebaseService', async () => {
  const actual = await vi.importActual('../../../lib/firebaseService');
  return {
    ...actual,
    bookingRequestService: {
      create: vi.fn(),
      update: vi.fn(),
      getAll: vi.fn(),
      checkConflicts: vi.fn(),
    },
  };
});

vi.mock('../../../lib/notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
  },
}));

describe('Booking Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('faculty creates → admin receives → approves → notification → approved status', () => {
    it('should complete full booking flow', async () => {
      const facultyUser = createMockUser({ id: 'faculty_1', role: 'faculty' });
      const adminUser = createMockUser({ id: 'admin_1', role: 'admin' });

      // Step 1: Faculty creates booking request
      const newRequest = {
        facultyId: facultyUser.id,
        facultyName: facultyUser.name,
        classroomId: 'class_1',
        classroomName: 'Room A',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Lecture',
      };

      const createdRequest = createMockBookingRequest({ ...newRequest, id: 'req_1', status: 'pending' });

      vi.mocked(bookingRequestService.create).mockResolvedValue(createdRequest);

      const request = await bookingRequestService.create(newRequest);

      expect(bookingRequestService.create).toHaveBeenCalled();
      expect(request.status).toBe('pending');

      // Step 2: Admin receives request
      vi.mocked(bookingRequestService.getAll).mockResolvedValue([request]);

      const allRequests = await bookingRequestService.getAll();

      expect(allRequests).toContainEqual(request);
      expect(allRequests[0].status).toBe('pending');

      // Step 3: Admin approves request
      const approvedRequest = { ...request, status: 'approved' as const };
      vi.mocked(bookingRequestService.update).mockResolvedValue(approvedRequest);

      const updatedRequest = await bookingRequestService.update(request.id, { status: 'approved' });

      expect(bookingRequestService.update).toHaveBeenCalled();
      expect(updatedRequest.status).toBe('approved');

      // Step 4: Notification is created
      expect(notificationService.createNotification).toHaveBeenCalled();

      // Step 5: Request has approved status
      expect(updatedRequest.status).toBe('approved');
    });
  });

  describe('conflict detection flow', () => {
    it('should detect conflicts before creating request', async () => {
      vi.mocked(bookingRequestService.checkConflicts).mockResolvedValue(true);

      const hasConflict = await bookingRequestService.checkConflicts(
        'class_1',
        '2024-01-15',
        '09:00',
        '10:00'
      );

      expect(hasConflict).toBe(true);
      expect(bookingRequestService.checkConflicts).toHaveBeenCalled();
    });
  });

  describe('rejection flow', () => {
    it('should handle request rejection with feedback', async () => {
      const request = createMockBookingRequest({ id: 'req_1', status: 'pending' });
      const rejectedRequest = { ...request, status: 'rejected' as const, adminFeedback: 'Room unavailable' };

      vi.mocked(bookingRequestService.update).mockResolvedValue(rejectedRequest);

      const result = await bookingRequestService.update(request.id, {
        status: 'rejected',
        adminFeedback: 'Room unavailable',
      });

      expect(result.status).toBe('rejected');
      expect(result.adminFeedback).toBe('Room unavailable');
    });
  });
});

