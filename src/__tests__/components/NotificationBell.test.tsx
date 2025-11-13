import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '../../components/NotificationBell';
import { NotificationProvider } from '../../contexts/NotificationContext';

describe('NotificationBell', () => {
  it('renders with zero unread when context has none', async () => {
    const mockValue = {
      notifications: [],
      unreadCount: 0,
      isNotificationCenterOpen: false,
      isLoading: false,
      onAcknowledge: async () => {},
      onAcknowledgeAll: async () => null,
      onToggleCenter: () => {},
      onMarkAllAsRead: async () => {},
    } as any;

    render(
      <NotificationProvider value={mockValue}>
        <NotificationBell />
      </NotificationProvider>
    );

    const btn = screen.getByRole('button', { name: /Notifications \(0 unread\)/ });
    expect(btn).toBeInTheDocument();
  });

  it('shows unread badge when unreadCount > 0', async () => {
    const mockValue = {
      notifications: [{ id: '1', message: 'x' }],
      unreadCount: 3,
      isNotificationCenterOpen: false,
      isLoading: false,
      onAcknowledge: async () => {},
      onAcknowledgeAll: async () => null,
      onToggleCenter: () => {},
      onMarkAllAsRead: async () => {},
    } as any;

    render(
      <NotificationProvider value={mockValue}>
        <NotificationBell />
      </NotificationProvider>
    );

    const btn = screen.getByRole('button', { name: /Notifications \(3 unread\)/ });
    expect(btn).toBeInTheDocument();
    // Badge text is visible via aria-hidden span; verify the label contains the count
  });
});
