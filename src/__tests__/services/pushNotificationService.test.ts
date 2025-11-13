import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pushService from '../../../lib/pushService';

// Mock Notification API
const mockNotificationPermission = vi.fn();
const mockRequestPermission = vi.fn();
const mockServiceWorkerRegistration = {
  pushManager: {
    subscribe: vi.fn(),
    getSubscription: vi.fn(),
  },
};

global.Notification = {
  permission: 'default',
  requestPermission: mockRequestPermission,
} as any;

global.navigator = {
  serviceWorker: {
    register: vi.fn().mockResolvedValue(mockServiceWorkerRegistration),
    ready: Promise.resolve(mockServiceWorkerRegistration),
  },
} as any;

describe('pushService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestPermission.mockResolvedValue('granted');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('isPushSupported', () => {
    it('should check if push notifications are supported', () => {
      const isSupported = pushService.isPushSupported();

      expect(typeof isSupported).toBe('boolean');
    });

    it('should return false when Notification API is not available', () => {
      const originalNotification = global.Notification;
      delete (global as any).Notification;

      const isSupported = pushService.isPushSupported();

      expect(isSupported).toBe(false);

      global.Notification = originalNotification;
    });
  });

  describe('requestPermission', () => {
    it('should request notification permission', async () => {
      mockRequestPermission.mockResolvedValue('granted');

      const permission = await pushService.requestPermission();

      expect(permission).toBe('granted');
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('should handle denied permission', async () => {
      mockRequestPermission.mockResolvedValue('denied');

      const permission = await pushService.requestPermission();

      expect(permission).toBe('denied');
    });

    it('should handle default permission state', async () => {
      mockRequestPermission.mockResolvedValue('default');

      const permission = await pushService.requestPermission();

      expect(permission).toBe('default');
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker for push notifications', async () => {
      const mockRegister = vi.fn().mockResolvedValue(mockServiceWorkerRegistration);
      global.navigator.serviceWorker.register = mockRegister;

      const registration = await pushService.registerServiceWorker('/sw.js');

      expect(mockRegister).toHaveBeenCalledWith('/sw.js');
      expect(registration).toBeDefined();
    });

    it('should handle service worker registration errors', async () => {
      const mockRegister = vi.fn().mockRejectedValue(new Error('Registration failed'));
      global.navigator.serviceWorker.register = mockRegister;

      await expect(pushService.registerServiceWorker('/sw.js')).rejects.toThrow();
    });
  });

  describe('subscribeToPush', () => {
    it('should subscribe to push notifications', async () => {
      const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/...',
        keys: {
          p256dh: 'key',
          auth: 'auth',
        },
      };

      mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockSubscription);

      const subscription = await pushService.subscribeToPush(mockServiceWorkerRegistration as any);

      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalled();
      expect(subscription).toBeDefined();
    });

    it('should handle subscription errors', async () => {
      mockServiceWorkerRegistration.pushManager.subscribe.mockRejectedValue(
        new Error('Subscription failed')
      );

      await expect(
        pushService.subscribeToPush(mockServiceWorkerRegistration as any)
      ).rejects.toThrow();
    });
  });

  describe('getSubscription', () => {
    it('should get existing push subscription', async () => {
      const mockSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/...',
        keys: {
          p256dh: 'key',
          auth: 'auth',
        },
      };

      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockSubscription);

      const subscription = await pushService.getSubscription(mockServiceWorkerRegistration as any);

      expect(mockServiceWorkerRegistration.pushManager.getSubscription).toHaveBeenCalled();
      expect(subscription).toBeDefined();
    });

    it('should return null when no subscription exists', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);

      const subscription = await pushService.getSubscription(mockServiceWorkerRegistration as any);

      expect(subscription).toBeNull();
    });
  });

  describe('unsubscribeFromPush', () => {
    it('should unsubscribe from push notifications', async () => {
      const mockSubscription = {
        unsubscribe: vi.fn().mockResolvedValue(true),
      };

      const result = await pushService.unsubscribeFromPush(mockSubscription as any);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('sendTestNotification', () => {
    it('should send test push notification', async () => {
      const mockShowNotification = vi.fn();
      mockServiceWorkerRegistration.showNotification = mockShowNotification;

      await pushService.sendTestNotification(mockServiceWorkerRegistration as any);

      expect(mockShowNotification).toHaveBeenCalled();
    });
  });
});

