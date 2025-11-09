/**
 * NotificationBell.test.tsx
 * 
 * Tests for notification bell icon component.
 * Covers:
 * - Badge counter display
 * - Real-time unread count updates
 * - Click to open NotificationCenter
 * - Visual indicators (red badge)
 * - Force unread prop override
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../../../components/NotificationBell';
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
    getUnreadCount: vi.fn(),
    setupNotificationsListener: vi.fn(),
  },
}));

describe('NotificationBell', () => {
  const mockUserId = 'user-123';
  const mockOnOpen = vi.fn();

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    id: `notif-${Date.now()}-${Math.random()}`,
    userId: mockUserId,
    type: 'approved',
    message: 'Test notification',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acknowledgedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render bell icon', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should have accessible aria-label', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (0 unread)');
      });
    });

    it('should render bell without badge when count is zero', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('should render bell with badge when count is positive', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should render bell without badge when no userId', () => {
      render(<NotificationBell userId={null} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(notificationService.getUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('Unread Count Display', () => {
    it('should display initial unread count', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should update count via real-time listener', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(2);
      
      let listenerCallback: ((items: Notification[]) => void) | undefined;
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        listenerCallback = callback;
        return () => {};
      });

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      // Simulate listener update with 4 unread notifications
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }),
        createMockNotification({ id: 'n2', acknowledgedAt: null }),
        createMockNotification({ id: 'n3', acknowledgedAt: null }),
        createMockNotification({ id: 'n4', acknowledgedAt: null }),
      ];
      listenerCallback?.(notifications);

      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });
    });

    it('should only count unacknowledged notifications', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      
      let listenerCallback: ((items: Notification[]) => void) | undefined;
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        listenerCallback = callback;
        return () => {};
      });

      render(<NotificationBell userId={mockUserId} />);

      // Simulate listener with 2 unread and 2 acknowledged
      const notifications = [
        createMockNotification({ id: 'n1', acknowledgedAt: null }), // Unread
        createMockNotification({ id: 'n2', acknowledgedAt: new Date().toISOString() }), // Read
        createMockNotification({ id: 'n3', acknowledgedAt: null }), // Unread
        createMockNotification({ id: 'n4', acknowledgedAt: new Date().toISOString() }), // Read
      ];
      listenerCallback?.(notifications);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should display single digit counts', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(7);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('7')).toBeInTheDocument();
      });
    });

    it('should display double digit counts', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(42);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument();
      });
    });

    it('should display triple digit counts', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(999);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('999')).toBeInTheDocument();
      });
    });
  });

  describe('Force Unread Override', () => {
    it('should use forceUnread when provided', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} forceUnread={10} />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should use forceUnread even when zero', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} forceUnread={0} />);

      await waitFor(() => {
        // Should not show badge when forceUnread is 0
        expect(screen.queryByText('5')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });

    it('should update aria-label with forceUnread value', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} forceUnread={8} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (8 unread)');
      });
    });

    it('should not use forceUnread when null', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} forceUnread={null} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should not use forceUnread when undefined', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} forceUnread={undefined} />);

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  describe('Click Functionality', () => {
    it('should call onOpen when clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} onOpen={mockOnOpen} />);

      await user.click(screen.getByRole('button'));

      expect(mockOnOpen).toHaveBeenCalled();
    });

    it('should be clickable even without onOpen', async () => {
      const user = userEvent.setup();
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await expect(async () => {
        await user.click(screen.getByRole('button'));
      }).not.toThrow();
    });

    it('should call onOpen multiple times', async () => {
      const user = userEvent.setup();
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} onOpen={mockOnOpen} />);

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('button'));
      await user.click(screen.getByRole('button'));

      expect(mockOnOpen).toHaveBeenCalledTimes(3);
    });
  });

  describe('Real-time Listener', () => {
    it('should setup listener on mount', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(notificationService.setupNotificationsListener).toHaveBeenCalledWith(
          expect.any(Function),
          undefined,
          mockUserId
        );
      });
    });

    it('should cleanup listener on unmount', async () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(mockUnsubscribe);

      const { unmount } = render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(notificationService.setupNotificationsListener).toHaveBeenCalled();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should reset listener when userId changes', async () => {
      const mockUnsubscribe1 = vi.fn();
      const mockUnsubscribe2 = vi.fn();
      
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener)
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2);

      const { rerender } = render(<NotificationBell userId="user-1" />);

      await waitFor(() => {
        expect(notificationService.setupNotificationsListener).toHaveBeenCalledWith(
          expect.any(Function),
          undefined,
          'user-1'
        );
      });

      rerender(<NotificationBell userId="user-2" />);

      await waitFor(() => {
        expect(mockUnsubscribe1).toHaveBeenCalled();
        expect(notificationService.setupNotificationsListener).toHaveBeenCalledWith(
          expect.any(Function),
          undefined,
          'user-2'
        );
      });
    });

    it('should not setup listener when userId is null', () => {
      render(<NotificationBell userId={null} />);

      expect(notificationService.getUnreadCount).not.toHaveBeenCalled();
      expect(notificationService.setupNotificationsListener).not.toHaveBeenCalled();
    });

    it('should reset count to zero when userId changes to null', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      const { rerender } = render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      rerender(<NotificationBell userId={null} />);

      await waitFor(() => {
        expect(screen.queryByText('5')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should log error when getUnreadCount fails', async () => {
      const mockError = new Error('Failed to get count');
      vi.mocked(notificationService.getUnreadCount).mockRejectedValue(mockError);

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('NotificationBell error:', mockError);
      });
    });

    it('should log error when listener setup fails', async () => {
      const mockError = new Error('Listener setup failed');
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation(() => {
        throw mockError;
      });

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('NotificationBell error:', mockError);
      });
    });

    it('should remain functional after error', async () => {
      const user = userEvent.setup();
      const mockError = new Error('Failed to get count');
      vi.mocked(notificationService.getUnreadCount).mockRejectedValue(mockError);

      render(<NotificationBell userId={mockUserId} onOpen={mockOnOpen} />);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
      });

      // Should still be clickable
      await user.click(screen.getByRole('button'));
      expect(mockOnOpen).toHaveBeenCalled();
    });
  });

  describe('Visual Styling', () => {
    it('should apply red background to badge', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveClass('bg-red-600');
      });
    });

    it('should apply white text to badge', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveClass('text-white');
      });
    });

    it('should position badge absolutely', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveClass('absolute');
      });
    });

    it('should make badge rounded', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveClass('rounded-full');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role button', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should include unread count in aria-label', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(7);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Notifications (7 unread)');
      });
    });

    it('should mark badge as aria-hidden', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const badge = screen.getByText('3');
        expect(badge).toHaveAttribute('aria-hidden');
      });
    });

    it('should mark icon as aria-hidden', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(0);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      const { container } = render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        const icon = container.querySelector('[aria-hidden]');
        expect(icon).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative count gracefully', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(-5);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        // Should not show badge for negative count
        expect(screen.queryByText('-5')).not.toBeInTheDocument();
      });
    });

    it('should handle very large counts', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(9999);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('9999')).toBeInTheDocument();
      });
    });

    it('should handle empty string userId', () => {
      render(<NotificationBell userId="" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(notificationService.getUnreadCount).not.toHaveBeenCalled();
    });

    it('should handle rapid re-renders', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.setupNotificationsListener).mockReturnValue(() => {});

      const { rerender } = render(<NotificationBell userId={mockUserId} />);

      for (let i = 0; i < 10; i++) {
        rerender(<NotificationBell userId={mockUserId} forceUnread={i} />);
      }

      await waitFor(() => {
        expect(screen.getByText('9')).toBeInTheDocument();
      });
    });

    it('should handle listener callback with empty array', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);
      
      let listenerCallback: ((items: Notification[]) => void) | undefined;
      vi.mocked(notificationService.setupNotificationsListener).mockImplementation((callback) => {
        listenerCallback = callback;
        return () => {};
      });

      render(<NotificationBell userId={mockUserId} />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });

      // Simulate listener with empty array
      listenerCallback?.([]);

      await waitFor(() => {
        expect(screen.queryByText('5')).not.toBeInTheDocument();
        expect(screen.queryByText('0')).not.toBeInTheDocument();
      });
    });
  });
});
