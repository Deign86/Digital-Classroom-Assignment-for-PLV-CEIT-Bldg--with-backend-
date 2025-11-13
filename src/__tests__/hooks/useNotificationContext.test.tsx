import { renderHook } from '@testing-library/react';
import { useNotificationContext, NotificationProvider } from '../../../contexts/NotificationContext';

describe('useNotificationContext', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useNotificationContext())).toThrow(
      'useNotificationContext must be used within NotificationContext.Provider'
    );
  });

  it('returns value when inside provider', () => {
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

    const wrapper = ({ children }: any) => (
      <NotificationProvider value={mockValue}>{children}</NotificationProvider>
    );

    const { result } = renderHook(() => useNotificationContext(), { wrapper });
    expect(result.current.unreadCount).toBe(0);
    expect(typeof result.current.onToggleCenter).toBe('function');
  });
});
