import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createNotification,
  acknowledgeNotification,
  acknowledgeNotifications,
  getNotificationById,
  getUnreadCount,
  setupNotificationsListener,
  notificationService,
  type NotificationType,
} from '../../../lib/notificationService';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(),
  getFirebaseApp: vi.fn(() => ({ options: { projectId: 'test-project' } })),
}));

vi.mock('../../../lib/withRetry', () => ({
  default: vi.fn((fn) => fn()),
  isNetworkError: vi.fn((err) => err.message.includes('network')),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp, getFirebaseDb } from '../../../lib/firebaseConfig';
import { getDoc, getDocs, query, where, orderBy, onSnapshot, collection } from 'firebase/firestore';
import withRetry from '../../../lib/withRetry';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification via Cloud Function', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif123', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const id = await createNotification('user1', 'approved', 'Your request was approved');

      expect(id).toBe('notif123');
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createNotification');
      expect(mockCallable).toHaveBeenCalledWith({
        userId: 'user1',
        type: 'approved',
        message: 'Your request was approved',
        bookingRequestId: undefined,
        adminFeedback: undefined,
        actorId: undefined,
      });
    });

    it('should create notification with optional parameters', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif456', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const id = await createNotification('user2', 'rejected', 'Request rejected', {
        bookingRequestId: 'booking123',
        adminFeedback: 'Room unavailable',
        actorId: 'admin1',
      });

      expect(id).toBe('notif456');
      expect(mockCallable).toHaveBeenCalledWith({
        userId: 'user2',
        type: 'rejected',
        message: 'Request rejected',
        bookingRequestId: 'booking123',
        adminFeedback: 'Room unavailable',
        actorId: 'admin1',
      });
    });

    it('should return null when self-notification is skipped', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { skipped: true, id: null },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const id = await createNotification('user1', 'info', 'Test', { actorId: 'user1' });

      expect(id).toBeNull();
    });

    it('should throw error when no id is returned', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: false },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      await expect(createNotification('user1', 'info', 'Test')).rejects.toThrow(
        'Notification creation failed: no id returned'
      );
    });

    it('should retry on network errors', async () => {
      const mockCallable = vi.fn().mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce({
        data: { id: 'notif789', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
      vi.mocked(withRetry).mockImplementation(async (fn, opts) => {
        try {
          return await fn();
        } catch (err) {
          if (opts?.shouldRetry?.(err)) {
            return await fn();
          }
          throw err;
        }
      });

      const id = await createNotification('user3', 'info', 'Test message');

      expect(id).toBe('notif789');
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should handle all notification types', async () => {
      const types: NotificationType[] = ['approved', 'rejected', 'info', 'cancelled', 'signup'];
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif-type', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      for (const type of types) {
        await createNotification('user1', type, `Test ${type}`);
        expect(mockCallable).toHaveBeenCalledWith(
          expect.objectContaining({
            type,
            message: `Test ${type}`,
          })
        );
      }

      expect(mockCallable).toHaveBeenCalledTimes(5);
    });

    it('should handle empty message', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif-empty', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const id = await createNotification('user1', 'info', '');

      expect(id).toBe('notif-empty');
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({ message: '' })
      );
    });

    it('should handle special characters in message', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif-special', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const message = 'Test <script>alert("xss")</script> & emoji 🎉';
      const id = await createNotification('user1', 'info', message);

      expect(id).toBe('notif-special');
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({ message })
      );
    });
  });

  describe('acknowledgeNotification', () => {
    it('should acknowledge notification via Cloud Function', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      await acknowledgeNotification('notif123', 'user1');

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'acknowledgeNotification');
      expect(mockCallable).toHaveBeenCalledWith({ notificationId: 'notif123' });
    });

    it('should throw error when acknowledgment fails', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: false },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      await expect(acknowledgeNotification('notif123', 'user1')).rejects.toThrow(
        'Failed to acknowledge notification'
      );
    });

    it('should retry on network errors', async () => {
      const mockCallable = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
      vi.mocked(withRetry).mockImplementation(async (fn, opts) => {
        try {
          return await fn();
        } catch (err) {
          if (opts?.shouldRetry?.(err)) {
            return await fn();
          }
          throw err;
        }
      });

      await acknowledgeNotification('notif456', 'user2');

      expect(mockCallable).toHaveBeenCalledTimes(2);
    });

    it('should handle empty notification ID', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      await acknowledgeNotification('', 'user1');

      expect(mockCallable).toHaveBeenCalledWith({ notificationId: '' });
    });
  });

  describe('acknowledgeNotifications', () => {
    it('should acknowledge multiple notifications', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, unreadCount: 5 },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const unreadCount = await acknowledgeNotifications(['notif1', 'notif2', 'notif3'], 'user1');

      expect(unreadCount).toBe(5);
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'acknowledgeNotifications');
      expect(mockCallable).toHaveBeenCalledWith({ notificationIds: ['notif1', 'notif2', 'notif3'] });
    });

    it('should return 0 when unreadCount is not provided', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const unreadCount = await acknowledgeNotifications(['notif1'], 'user1');

      expect(unreadCount).toBe(0);
    });

    it('should throw error when batch acknowledgment fails', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: false },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      await expect(acknowledgeNotifications(['notif1', 'notif2'], 'user1')).rejects.toThrow(
        'Failed to acknowledge notifications'
      );
    });

    it('should handle empty array', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, unreadCount: 10 },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const unreadCount = await acknowledgeNotifications([], 'user1');

      expect(unreadCount).toBe(10);
      expect(mockCallable).toHaveBeenCalledWith({ notificationIds: [] });
    });

    it('should handle single notification', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, unreadCount: 0 },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const unreadCount = await acknowledgeNotifications(['notif1'], 'user1');

      expect(unreadCount).toBe(0);
    });

    it('should retry on network errors', async () => {
      const mockCallable = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce({ data: { success: true, unreadCount: 3 } });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);
      vi.mocked(withRetry).mockImplementation(async (fn, opts) => {
        try {
          return await fn();
        } catch (err) {
          if (opts?.shouldRetry?.(err)) {
            return await fn();
          }
          throw err;
        }
      });

      const unreadCount = await acknowledgeNotifications(['notif1', 'notif2'], 'user1');

      expect(unreadCount).toBe(3);
      expect(mockCallable).toHaveBeenCalledTimes(2);
    });
  });

  describe('getNotificationById', () => {
    it('should retrieve notification by ID', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'notif123',
        data: () => ({
          userId: 'user1',
          type: 'approved',
          message: 'Test message',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
          acknowledgedBy: null,
          acknowledgedAt: null,
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif123');

      expect(notification).toEqual({
        id: 'notif123',
        userId: 'user1',
        type: 'approved',
        message: 'Test message',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        acknowledgedBy: null,
        acknowledgedAt: null,
      });
    });

    it('should return null when notification does not exist', async () => {
      const mockDoc = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('nonexistent');

      expect(notification).toBeNull();
    });

    it('should handle Firestore Timestamp objects', async () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-01-15T10:30:00.000Z'),
      };
      const mockDoc = {
        exists: () => true,
        id: 'notif456',
        data: () => ({
          userId: 'user2',
          type: 'info',
          message: 'Info message',
          createdAt: mockTimestamp,
          updatedAt: mockTimestamp,
          acknowledgedBy: 'user2',
          acknowledgedAt: mockTimestamp,
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif456');

      expect(notification?.createdAt).toBe('2025-01-15T10:30:00.000Z');
      expect(notification?.updatedAt).toBe('2025-01-15T10:30:00.000Z');
      expect(notification?.acknowledgedAt).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should handle optional fields', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'notif789',
        data: () => ({
          userId: 'user3',
          type: 'rejected',
          message: 'Rejected',
          bookingRequestId: 'booking123',
          adminFeedback: 'Insufficient justification',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif789');

      expect(notification?.bookingRequestId).toBe('booking123');
      expect(notification?.adminFeedback).toBe('Insufficient justification');
    });

    it('should handle null timestamps gracefully', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'notif-null',
        data: () => ({
          userId: 'user1',
          type: 'info',
          message: 'Test',
          createdAt: null,
          updatedAt: null,
          acknowledgedAt: null,
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif-null');

      // Should use current time when timestamps are null
      expect(notification?.createdAt).toBeTruthy();
      expect(notification?.updatedAt).toBeTruthy();
      expect(notification?.acknowledgedAt).toBeNull();
    });

    it('should handle numeric timestamps', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'notif-numeric',
        data: () => ({
          userId: 'user1',
          type: 'info',
          message: 'Test',
          createdAt: 1704067200000, // 2024-01-01
          updatedAt: 1704067200000,
          acknowledgedAt: null,
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif-numeric');

      expect(notification?.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(notification?.updatedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const mockSnapshot = { size: 7 };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);

      const count = await getUnreadCount('user1');

      expect(count).toBe(7);
      expect(where).toHaveBeenCalledWith('userId', '==', 'user1');
      expect(where).toHaveBeenCalledWith('acknowledgedAt', '==', null);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockSnapshot = { size: 0 };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);

      const count = await getUnreadCount('user2');

      expect(count).toBe(0);
    });

    it('should handle empty user ID', async () => {
      const mockSnapshot = { size: 0 };
      vi.mocked(getDocs).mockResolvedValue(mockSnapshot as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);

      const count = await getUnreadCount('');

      expect(count).toBe(0);
      expect(where).toHaveBeenCalledWith('userId', '==', '');
    });
  });

  describe('setupNotificationsListener', () => {
    it('should set up listener with user filter', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      const unsubscribe = setupNotificationsListener(callback, undefined, 'user1');

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(where).toHaveBeenCalledWith('userId', '==', 'user1');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should set up listener without user filter', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(onSnapshot).mockReturnValue(mockUnsubscribe);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      const unsubscribe = setupNotificationsListener(callback);

      expect(unsubscribe).toBe(mockUnsubscribe);
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should call callback with notifications on update', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'notif1',
            data: () => ({
              userId: 'user1',
              type: 'approved',
              message: 'Approved',
              createdAt: '2025-01-01T00:00:00.000Z',
              updatedAt: '2025-01-01T00:00:00.000Z',
            }),
          },
          {
            id: 'notif2',
            data: () => ({
              userId: 'user1',
              type: 'info',
              message: 'Info',
              createdAt: '2025-01-02T00:00:00.000Z',
              updatedAt: '2025-01-02T00:00:00.000Z',
            }),
          },
        ],
      };

      let snapshotCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        snapshotCallback = success;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      setupNotificationsListener(callback, undefined, 'user1');

      snapshotCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'notif1',
          type: 'approved',
          message: 'Approved',
        }),
        expect.objectContaining({
          id: 'notif2',
          type: 'info',
          message: 'Info',
        }),
      ]);
    });

    it('should call error callback on snapshot error', () => {
      let errorCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        errorCallback = error;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      const errorCb = vi.fn();
      setupNotificationsListener(callback, errorCb, 'user1');

      const error = new Error('Permission denied');
      errorCallback(error);

      expect(errorCb).toHaveBeenCalledWith(error);
    });

    it('should handle non-Error objects in error callback', () => {
      let errorCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        errorCallback = error;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      const errorCb = vi.fn();
      setupNotificationsListener(callback, errorCb, 'user1');

      errorCallback('String error');

      expect(errorCb).toHaveBeenCalledWith(expect.any(Error));
      expect(errorCb).toHaveBeenCalledWith(expect.objectContaining({ message: 'String error' }));
    });

    it('should handle errors during callback execution', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'notif1',
            data: () => {
              throw new Error('Data parsing error');
            },
          },
        ],
      };

      let snapshotCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        snapshotCallback = success;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      const errorCb = vi.fn();
      setupNotificationsListener(callback, errorCb, 'user1');

      snapshotCallback(mockSnapshot);

      expect(errorCb).toHaveBeenCalledWith(expect.objectContaining({ message: 'Data parsing error' }));
    });

    it('should not call error callback if not provided', () => {
      const mockSnapshot = {
        docs: [
          {
            id: 'notif1',
            data: () => {
              throw new Error('Data parsing error');
            },
          },
        ],
      };

      let snapshotCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        snapshotCallback = success;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      setupNotificationsListener(callback);

      // Should not throw even without error callback
      expect(() => snapshotCallback(mockSnapshot)).not.toThrow();
    });
  });

  describe('notificationService object', () => {
    it('should export all service methods', () => {
      expect(notificationService).toHaveProperty('createNotification');
      expect(notificationService).toHaveProperty('acknowledgeNotification');
      expect(notificationService).toHaveProperty('acknowledgeNotifications');
      expect(notificationService).toHaveProperty('getNotificationById');
      expect(notificationService).toHaveProperty('getUnreadCount');
      expect(notificationService).toHaveProperty('setupNotificationsListener');
    });

    it('should have correct method signatures', () => {
      expect(typeof notificationService.createNotification).toBe('function');
      expect(typeof notificationService.acknowledgeNotification).toBe('function');
      expect(typeof notificationService.acknowledgeNotifications).toBe('function');
      expect(typeof notificationService.getNotificationById).toBe('function');
      expect(typeof notificationService.getUnreadCount).toBe('function');
      expect(typeof notificationService.setupNotificationsListener).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif-long', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const id = await createNotification('user1', 'info', longMessage);

      expect(id).toBe('notif-long');
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({ message: longMessage })
      );
    });

    it('should handle concurrent listener callbacks', () => {
      const mockSnapshot = {
        docs: Array.from({ length: 100 }, (_, i) => ({
          id: `notif${i}`,
          data: () => ({
            userId: 'user1',
            type: 'info',
            message: `Message ${i}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        })),
      };

      let snapshotCallback: any;
      vi.mocked(onSnapshot).mockImplementation((q, success, error) => {
        snapshotCallback = success;
        return vi.fn();
      });
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(getFirebaseApp).mockReturnValue({ options: { projectId: 'test' } } as any);

      const callback = vi.fn();
      setupNotificationsListener(callback, undefined, 'user1');

      snapshotCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'notif0' }),
        expect.objectContaining({ id: 'notif99' }),
      ]));
      expect(callback.mock.calls[0][0]).toHaveLength(100);
    });

    it('should handle malformed notification data gracefully', async () => {
      const mockDoc = {
        exists: () => true,
        id: 'notif-malformed',
        data: () => ({
          // Missing required fields
          type: 'info',
        }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDoc as any);
      vi.mocked(getFirebaseDb).mockReturnValue({} as any);

      const notification = await getNotificationById('notif-malformed');

      // Should still create notification object with defaults
      expect(notification?.id).toBe('notif-malformed');
      expect(notification?.type).toBe('info');
    });

    it('should handle acknowledgment of already acknowledged notification', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      // Should not throw even if already acknowledged
      await acknowledgeNotification('notif123', 'user1');

      expect(mockCallable).toHaveBeenCalled();
    });

    it('should handle large batch of notification IDs', async () => {
      const ids = Array.from({ length: 1000 }, (_, i) => `notif${i}`);
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, unreadCount: 0 },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const unreadCount = await acknowledgeNotifications(ids, 'user1');

      expect(unreadCount).toBe(0);
      expect(mockCallable).toHaveBeenCalledWith({ notificationIds: ids });
    });
  });

  describe('Performance', () => {
    it('should handle rapid notification creation', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'notif-rapid', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const promises = Array.from({ length: 50 }, (_, i) =>
        createNotification('user1', 'info', `Message ${i}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(results.every((id) => id === 'notif-rapid')).toBe(true);
      expect(mockCallable).toHaveBeenCalledTimes(50);
    });

    it('should handle rapid acknowledgments', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const promises = Array.from({ length: 50 }, (_, i) =>
        acknowledgeNotification(`notif${i}`, 'user1')
      );

      await Promise.all(promises);

      expect(mockCallable).toHaveBeenCalledTimes(50);
    });
  });
});
