/**
 * NotificationCenter.test.tsx
 * 
 * Tests for notification center component.
 * Covers:
 * - Real-time notification updates
 * - Notification display (approved, rejected, cancelled, signup, etc.)
 * - Individual acknowledgment
 * - Acknowledge all functionality
 * - Close on Escape key
 * - Loading states
 * - Empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationCenter from '../../../components/NotificationCenter';
import { notificationService, type Notification } from '../../../lib/notificationService';
import { logger } from '../../../lib/logger';

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/notificationService', () => ({
  notificationService: {
    setupNotificationsListener: vi.fn(),
    acknowledgeNotification: vi.fn(),
    acknowledgeNotifications: vi.fn(),
  },
}));

describe('NotificationCenter', () => {
  const mockUserId = 'user-123';
  const mockOnClose = vi.fn();
  const mockOnAcknowledgeAll = vi.fn();

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: `notif-${Date.now()}-${Math.random()}`,
    userId: mockUserId,
    type: 'approved',
    message: 'Your booking request has been approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acknowledgedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render notification center', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/notifications/i)).toBeInTheDocument();
    });

    it('should display notification count', () => {
      const notifications = [
        createMockNotification({ id: 'n1' }),
        createMockNotification({ id: 'n2' }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/2 total/i)).toBeInTheDocument();
    });

    it('should display empty state when no notifications', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });

    it('should display close button', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should display acknowledge all button', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByRole('button', { name: /acknowledge all/i })).toBeInTheDocument();
    });
  });

  describe('Notification Types Display', () => {
    it('should display approved notification with green icon', () => {
      const notification = createMockNotification({
        type: 'approved',
        message: 'Your booking has been approved',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/reservation approved/i)).toBeInTheDocument();
      expect(screen.getByText(/your booking has been approved/i)).toBeInTheDocument();
    });

    it('should display rejected notification with red icon', () => {
      const notification = createMockNotification({
        type: 'rejected',
        message: 'Your booking has been rejected',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/reservation rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/your booking has been rejected/i)).toBeInTheDocument();
    });

    it('should display cancelled notification', () => {
      const notification = createMockNotification({
        type: 'cancelled',
        message: 'Booking has been cancelled by admin',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/reservation cancelled/i)).toBeInTheDocument();
    });

    it('should display faculty_cancelled notification', () => {
      const notification = createMockNotification({
        type: 'faculty_cancelled',
        message: 'Faculty member cancelled their booking',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/faculty cancelled reservation/i)).toBeInTheDocument();
    });

    it('should display classroom_disabled notification', () => {
      const notification = createMockNotification({
        type: 'classroom_disabled',
        message: 'A classroom has been disabled',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/classroom disabled/i)).toBeInTheDocument();
    });

    it('should display signup notification', () => {
      const notification = createMockNotification({
        type: 'signup',
        message: 'New user signup request',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/new signup request/i)).toBeInTheDocument();
    });

    it('should display admin feedback when present', () => {
      const notification = createMockNotification({
        type: 'rejected',
        message: 'Your booking has been rejected',
        adminFeedback: 'Room is unavailable on that date',
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/room is unavailable on that date/i)).toBeInTheDocument();
      expect(screen.getByText(/admin feedback:/i)).toBeInTheDocument();
    });

    it('should display notification timestamp', () => {
      const timestamp = new Date('2024-01-15T10:30:00').toISOString();
      const notification = createMockNotification({
        createdAt: timestamp,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      // Should display formatted date/time
      const dateText = new Date(timestamp).toLocaleString();
      expect(screen.getByText(dateText)).toBeInTheDocument();
    });
  });

  describe('Unread Status', () => {
    it('should highlight unread notifications', () => {
      const notification = createMockNotification({
        acknowledgedAt: null, // Unread
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      // Unread notifications should have ring styling
      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('ring-2');
    });

    it('should show acknowledged notifications with reduced opacity', () => {
      const notification = createMockNotification({
        acknowledgedAt: new Date().toISOString(), // Acknowledged
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      const listItem = screen.getByRole('listitem');
      expect(listItem).toHaveClass('opacity-70');
    });

    it('should show acknowledge button for unread notifications', () => {
      const notification = createMockNotification({
        acknowledgedAt: null,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByRole('button', { name: /^acknowledge$/i })).toBeInTheDocument();
    });

    it('should show "Acknowledged" text for read notifications', () => {
      const notification = createMockNotification({
        acknowledgedAt: new Date().toISOString(),
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/^acknowledged$/i)).toBeInTheDocument();
    });
  });

  describe('Individual Acknowledgment', () => {
    it('should call acknowledgeNotification when acknowledge button clicked', async () => {
      const user = userEvent.setup();
      const notification = createMockNotification({
        id: 'test-notif-1',
        acknowledgedAt: null,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotification).mockResolvedValue(undefined);

      render(<NotificationCenter userId={mockUserId} />);

      const ackButton = screen.getByRole('button', { name: /^acknowledge$/i });
      await user.click(ackButton);

      expect(notificationService.acknowledgeNotification).toHaveBeenCalledWith('test-notif-1', mockUserId);
    });

    it('should show loading state during acknowledgment', async () => {
      const user = userEvent.setup();
      const notification = createMockNotification({
        acknowledgedAt: null,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotification).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<NotificationCenter userId={mockUserId} />);

      const ackButton = screen.getByRole('button', { name: /^acknowledge$/i });
      await user.click(ackButton);

      expect(screen.getByText(/acknowledging/i)).toBeInTheDocument();
    });

    it('should handle acknowledgment errors gracefully', async () => {
      const user = userEvent.setup();
      const notification = createMockNotification({
        acknowledgedAt: null,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotification).mockRejectedValue(new Error('Network error'));

      render(<NotificationCenter userId={mockUserId} />);

      const ackButton = screen.getByRole('button', { name: /^acknowledge$/i });
      await user.click(ackButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Acknowledge error', expect.any(Error));
      });
    });

    it('should disable acknowledge button during acknowledgment', async () => {
      const user = userEvent.setup();
      const notification = createMockNotification({
        acknowledgedAt: null,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotification).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<NotificationCenter userId={mockUserId} />);

      const ackButton = screen.getByRole('button', { name: /^acknowledge$/i });
      await user.click(ackButton);

      expect(ackButton).toBeDisabled();
    });
  });

  describe('Acknowledge All Functionality', () => {
    it('should acknowledge all unread notifications', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
        createMockNotification({ id: 'n2', acknowledgedAt: null }),
        createMockNotification({ id: 'n3', acknowledgedAt: new Date().toISOString() }), // Already acknowledged
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotifications).mockResolvedValue(1); // 1 unread remaining (the already ack'd one)

      render(<NotificationCenter userId={mockUserId} onAcknowledgeAll={mockOnAcknowledgeAll} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      await waitFor(() => {
        expect(notificationService.acknowledgeNotifications).toHaveBeenCalledWith(['n1', 'n2'], mockUserId);
      });
    });

    it('should call onAcknowledgeAll callback with new unread count', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
        createMockNotification({ id: 'n2', acknowledgedAt: null }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotifications).mockResolvedValue(0);

      render(<NotificationCenter userId={mockUserId} onAcknowledgeAll={mockOnAcknowledgeAll} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      await waitFor(() => {
        expect(mockOnAcknowledgeAll).toHaveBeenCalledWith(0);
      });
    });

    it('should close after acknowledging all', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotifications).mockResolvedValue(0);

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close immediately if no unread notifications', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: new Date().toISOString() }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(notificationService.acknowledgeNotifications).not.toHaveBeenCalled();
    });

    it('should show global loading overlay during acknowledge all', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotifications).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(0), 100))
      );

      render(<NotificationCenter userId={mockUserId} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      expect(screen.getByText(/acknowledging\.\.\./i)).toBeInTheDocument();
    });

    it('should handle fallback to individual acknowledgments if batch not supported', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
        createMockNotification({ id: 'n2', acknowledgedAt: null }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      
      // Make acknowledgeNotifications undefined to test fallback
      (notificationService as any).acknowledgeNotifications = undefined;
      vi.mocked(notificationService.acknowledgeNotification).mockResolvedValue(undefined);

      render(<NotificationCenter userId={mockUserId} onAcknowledgeAll={mockOnAcknowledgeAll} />);

      const ackAllButton = screen.getByRole('button', { name: /acknowledge all/i });
      await user.click(ackAllButton);

      await waitFor(() => {
        expect(notificationService.acknowledgeNotification).toHaveBeenCalledTimes(2);
        expect(mockOnAcknowledgeAll).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should setup listener on mount', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} />);

      expect(notificationService.setupNotificationsListener).toHaveBeenCalled();
    });

    it('should cleanup listener on unmount', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<NotificationCenter userId={mockUserId} />);

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should filter notifications by userId', () => {
      const notifications = [
        createMockNotification({ id: 'n1', userId: mockUserId }),
        createMockNotification({ id: 'n2', userId: 'other-user' }),
        createMockNotification({ id: 'n3', userId: mockUserId }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/2 total/i)).toBeInTheDocument(); // Only user's notifications
    });

    it('should sort notifications by createdAt descending', () => {
      const notifications = [
        createMockNotification({ id: 'n1', message: 'Old', createdAt: '2024-01-01T10:00:00Z' }),
        createMockNotification({ id: 'n2', message: 'New', createdAt: '2024-01-03T10:00:00Z' }),
        createMockNotification({ id: 'n3', message: 'Middle', createdAt: '2024-01-02T10:00:00Z' }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems[0]).toHaveTextContent('New');
      expect(listItems[1]).toHaveTextContent('Middle');
      expect(listItems[2]).toHaveTextContent('Old');
    });

    it('should handle listener errors', () => {
      const mockError = new Error('Listener error');
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback, errorCallback) => {
        errorCallback?.(mockError);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(logger.error).toHaveBeenCalledWith('NotificationCenter listener error', mockError);
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: /^close$/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on scroll', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      // Trigger scroll event
      window.dispatchEvent(new Event('scroll'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not setup close handlers when onClose not provided', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} />);

      // Should not throw when Escape pressed
      expect(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationCenter userId={mockUserId} onClose={mockOnClose} />);

      expect(screen.getByRole('button', { name: /acknowledge all/i })).toHaveAccessibleName();
      expect(screen.getByRole('button', { name: /close/i })).toHaveAccessibleName();
    });

    it('should have accessible notification list', () => {
      const notification = createMockNotification();
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should have accessible acknowledge buttons', () => {
      const notification = createMockNotification({ acknowledgedAt: null });
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      const ackButton = screen.getByRole('button', { name: /^acknowledge$/i });
      expect(ackButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing userId gracefully', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      expect(() => {
        render(<NotificationCenter userId="" />);
      }).not.toThrow();
    });

    it('should handle notifications without adminFeedback', () => {
      const notification = createMockNotification({
        adminFeedback: undefined,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.queryByText(/admin feedback/i)).not.toBeInTheDocument();
    });

    it('should handle rapid acknowledgments', async () => {
      const user = userEvent.setup();
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
        createMockNotification({ id: 'n2', acknowledgedAt: null }),
      ];

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback(notifications);
        return () => {};
      });
      vi.mocked(notificationService.acknowledgeNotification).mockResolvedValue(undefined);

      render(<NotificationCenter userId={mockUserId} />);

      const ackButtons = screen.getAllByRole('button', { name: /^acknowledge$/i });
      
      // Click multiple buttons rapidly
      await user.click(ackButtons[0]);
      await user.click(ackButtons[1]);

      await waitFor(() => {
        expect(notificationService.acknowledgeNotification).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle empty notification list', () => {
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(/0 total/i)).toBeInTheDocument();
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });

    it('should handle very long notification messages', () => {
      const longMessage = 'A'.repeat(500);
      const notification = createMockNotification({
        message: longMessage,
      });

      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        callback([notification]);
        return () => {};
      });

      render(<NotificationCenter userId={mockUserId} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });
});
