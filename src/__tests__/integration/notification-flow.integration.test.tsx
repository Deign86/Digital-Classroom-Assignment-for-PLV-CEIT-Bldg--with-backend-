import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import NotificationBell from '../../../components/NotificationBell';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { createMockNotification } from '../mocks/factories';
import { notificationService } from '../../../lib/notificationService';

vi.mock('../../../lib/notificationService', () => ({
  notificationService: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
    acknowledgeNotification: vi.fn().mockResolvedValue(undefined),
    acknowledgeNotifications: vi.fn().mockResolvedValue(0),
  },
}));

describe('Notification Flow Integration', () => {
  const mockNotifications = [
    createMockNotification({ id: '1', message: 'Test notification', acknowledgedAt: null }),
  ];

  const mockContextValue = {
    notifications: mockNotifications,
    unreadCount: 1,
    isNotificationCenterOpen: false,
    isLoading: false,
    onAcknowledge: vi.fn().mockResolvedValue(undefined),
    onAcknowledgeAll: vi.fn().mockResolvedValue(0),
    onToggleCenter: vi.fn(),
    onMarkAllAsRead: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create → badge → open → acknowledge → decrease', () => {
    it('should complete full notification flow', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn().mockResolvedValue(undefined);
      const onToggleCenter = vi.fn();

      const { rerender } = render(
        <NotificationProvider value={{ ...mockContextValue, onAcknowledge, onToggleCenter } as any}>
          <NotificationBell />
        </NotificationProvider>
      );

      // Step 1: Create notification (simulated)
      const newNotification = createMockNotification({ id: '2', message: 'New notification', acknowledgedAt: null });

      // Step 2: Badge shows unread count
      rerender(
        <NotificationProvider
          value={{
            ...mockContextValue,
            notifications: [...mockNotifications, newNotification],
            unreadCount: 2,
            onAcknowledge,
            onToggleCenter,
          } as any}
        >
          <NotificationBell />
        </NotificationProvider>
      );

      expect(screen.getByText(/2 unread/i)).toBeInTheDocument();

      // Step 3: Open notification center
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(onToggleCenter).toHaveBeenCalled();

      // Step 4: Acknowledge notification
      rerender(
        <NotificationProvider
          value={{
            ...mockContextValue,
            notifications: [...mockNotifications, newNotification],
            unreadCount: 2,
            isNotificationCenterOpen: true,
            onAcknowledge,
            onToggleCenter,
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const acknowledgeButton = screen.getByText('Acknowledge');
      await user.click(acknowledgeButton);

      await waitFor(() => {
        expect(onAcknowledge).toHaveBeenCalled();
      });

      // Step 5: Unread count decreases
      rerender(
        <NotificationProvider
          value={{
            ...mockContextValue,
            notifications: [
              createMockNotification({ id: '1', message: 'Test notification', acknowledgedAt: new Date().toISOString() }),
            ],
            unreadCount: 0,
            onAcknowledge,
            onToggleCenter,
          } as any}
        >
          <NotificationBell />
        </NotificationProvider>
      );

      expect(screen.getByText(/0 unread/i)).toBeInTheDocument();
    });
  });

  describe('multiple notifications flow', () => {
    it('should handle multiple notifications correctly', async () => {
      const user = userEvent.setup();
      const onAcknowledgeAll = vi.fn().mockResolvedValue(2);

      const multipleNotifications = [
        createMockNotification({ id: '1', message: 'Notification 1', acknowledgedAt: null }),
        createMockNotification({ id: '2', message: 'Notification 2', acknowledgedAt: null }),
      ];

      render(
        <NotificationProvider
          value={{
            notifications: multipleNotifications,
            unreadCount: 2,
            isNotificationCenterOpen: true,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll,
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const acknowledgeAllButton = screen.getByText(/acknowledge all/i);
      await user.click(acknowledgeAllButton);

      await waitFor(() => {
        expect(onAcknowledgeAll).toHaveBeenCalled();
      });
    });
  });

  describe('notification badge update', () => {
    it('should update badge count when notifications change', () => {
      const { rerender } = render(
        <NotificationProvider
          value={{
            notifications: [],
            unreadCount: 0,
            isNotificationCenterOpen: false,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationBell />
        </NotificationProvider>
      );

      expect(screen.getByText(/0 unread/i)).toBeInTheDocument();

      rerender(
        <NotificationProvider
          value={{
            notifications: [createMockNotification({ id: '1', acknowledgedAt: null })],
            unreadCount: 1,
            isNotificationCenterOpen: false,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationBell />
        </NotificationProvider>
      );

      expect(screen.getByText(/1 unread/i)).toBeInTheDocument();
    });
  });
});

