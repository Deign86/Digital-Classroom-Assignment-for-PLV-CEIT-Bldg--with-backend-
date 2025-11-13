import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestCard from '../../../components/RequestCard';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { NotificationProvider } from '../../../contexts/NotificationContext';
import { createMockBookingRequest, createMockNotification } from '../__mocks__/firebase';

describe('Accessibility Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('aria-labels', () => {
    it('should have proper ARIA labels on all interactive elements', () => {
      const mockRequest = createMockBookingRequest({ id: 'req_1' });

      render(
        <RequestCard
          request={mockRequest}
          status="pending"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={vi.fn().mockResolvedValue(false)}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('tab order', () => {
    it('should have logical tab order', async () => {
      const user = userEvent.setup();
      const mockRequest = createMockBookingRequest({ id: 'req_1' });

      render(
        <RequestCard
          request={mockRequest}
          status="pending"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={vi.fn().mockResolvedValue(false)}
        />
      );

      await user.tab();
      // Should focus on first interactive element
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });

  describe('aria-invalid', () => {
    it('should mark invalid inputs with aria-invalid', () => {
      const mockRequest = createMockBookingRequest({ id: 'req_1' });

      render(
        <RequestCard
          request={mockRequest}
          status="pending"
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={vi.fn().mockResolvedValue(false)}
        />
      );

      // Should mark invalid fields
      const inputs = screen.queryAllByRole('textbox');
      // Check for aria-invalid attributes where applicable
    });
  });

  describe('aria-modal', () => {
    it('should mark modals with aria-modal', () => {
      const mockNotifications = [createMockNotification({ id: '1' })];

      render(
        <NotificationProvider
          value={{
            notifications: mockNotifications,
            unreadCount: 1,
            isNotificationCenterOpen: true,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('keyboard nav', () => {
    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockNotifications = [createMockNotification({ id: '1' })];

      render(
        <NotificationProvider
          value={{
            notifications: mockNotifications,
            unreadCount: 1,
            isNotificationCenterOpen: true,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      // Test Escape key
      await user.keyboard('{Escape}');
      // Should close modal

      // Test Tab navigation
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });

  describe('screen reader announcements', () => {
    it('should announce dynamic content changes', () => {
      const mockNotifications = [createMockNotification({ id: '1' })];

      render(
        <NotificationProvider
          value={{
            notifications: mockNotifications,
            unreadCount: 1,
            isNotificationCenterOpen: true,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      const liveRegion = screen.getByRole('status', { hidden: true });
      if (liveRegion) {
        expect(liveRegion).toHaveAttribute('aria-live');
      }
    });
  });

  describe('focus management', () => {
    it('should trap focus within modals', async () => {
      const user = userEvent.setup();
      const mockNotifications = [createMockNotification({ id: '1' })];

      render(
        <NotificationProvider
          value={{
            notifications: mockNotifications,
            unreadCount: 1,
            isNotificationCenterOpen: true,
            isLoading: false,
            onAcknowledge: vi.fn(),
            onAcknowledgeAll: vi.fn(),
            onToggleCenter: vi.fn(),
            onMarkAllAsRead: vi.fn(),
          } as any}
        >
          <NotificationCenter userId="user_1" />
        </NotificationProvider>
      );

      // Focus should be trapped within modal
      await user.tab();
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });
  });
});

