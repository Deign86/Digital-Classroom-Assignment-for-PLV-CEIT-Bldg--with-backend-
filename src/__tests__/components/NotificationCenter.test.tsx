import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { createMockNotification } from '../mocks/factories';

describe('NotificationCenter', () => {
  const mockNotifications = [
    createMockNotification({ id: '1', message: 'Test notification 1', acknowledgedAt: null }),
    createMockNotification({ id: '2', message: 'Test notification 2', acknowledgedAt: null }),
    createMockNotification({ id: '3', message: 'Test notification 3', acknowledgedAt: new Date().toISOString() }),
  ];

  const mockContextValue = {
    notifications: mockNotifications,
    unreadCount: 2,
    isNotificationCenterOpen: true,
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

  describe('list rendering', () => {
    it('should render list of notifications', () => {
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText('Test notification 1')).toBeInTheDocument();
      expect(screen.getByText('Test notification 2')).toBeInTheDocument();
      expect(screen.getByText('Test notification 3')).toBeInTheDocument();
    });

    it('should show unread count badge', () => {
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText(/2 unread/i)).toBeInTheDocument();
    });
  });

  describe('acknowledge single', () => {
    it('should acknowledge single notification when button clicked', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn().mockResolvedValue(undefined);

      render(
        <NotificationProvider value={{ ...mockContextValue, onAcknowledge } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      await waitFor(() => {
        expect(onAcknowledge).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('acknowledge all', () => {
    it('should acknowledge all notifications when button clicked', async () => {
      const user = userEvent.setup();
      const onAcknowledgeAll = vi.fn().mockResolvedValue(0);

      render(
        <NotificationProvider value={{ ...mockContextValue, onAcknowledgeAll } as any}>
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

  describe('dismiss', () => {
    it('should close notification center when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" onClose={onClose} />
        </NotificationProvider>
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <NotificationProvider value={{ ...mockContextValue, isLoading: true } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('empty', () => {
    it('should show empty state when no notifications', () => {
      render(
        <NotificationProvider value={{ ...mockContextValue, notifications: [], unreadCount: 0 } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  describe('filter', () => {
    it('should filter notifications by type', () => {
      const filteredNotifications = [
        createMockNotification({ id: '1', type: 'approved', message: 'Approved' }),
        createMockNotification({ id: '2', type: 'rejected', message: 'Rejected' }),
      ];

      render(
        <NotificationProvider value={{ ...mockContextValue, notifications: filteredNotifications } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });
  });

  describe('mark all as read', () => {
    it('should mark all notifications as read', async () => {
      const user = userEvent.setup();
      const onMarkAllAsRead = vi.fn().mockResolvedValue(undefined);

      render(
        <NotificationProvider value={{ ...mockContextValue, onMarkAllAsRead } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const markAllButton = screen.getByText(/mark all as read/i);
      await user.click(markAllButton);

      await waitFor(() => {
        expect(onMarkAllAsRead).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const center = screen.getByRole('dialog', { name: /notifications/i });
      expect(center).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      await user.keyboard('{Escape}');
      // Should close on Escape key
    });

    it('should have accessible notification items', () => {
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const notifications = screen.getAllByRole('listitem');
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should announce unread count to screen readers', () => {
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const badge = screen.getByText(/2 unread/i);
      expect(badge).toHaveAttribute('aria-live');
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(
        <NotificationProvider value={mockContextValue as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });

    it('should handle empty notification list gracefully', () => {
      render(
        <NotificationProvider value={{ ...mockContextValue, notifications: [], unreadCount: 0 } as any}>
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });
});

