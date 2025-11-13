import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNotification, acknowledgeNotification, acknowledgeNotifications } from '../../../lib/notificationService';

// We will mock firebase/functions httpsCallable to simulate server callables
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => {
    return async (payload: any) => {
      // Return a structure similar to the callable result
      return { data: { id: 'notif_test_1', skipped: false, success: true, unreadCount: 0 } };
    };
  }),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createNotification resolves with id for normal payload', async () => {
    const id = await createNotification('uid_user_1', 'info', 'Test message', { actorId: 'admin_1' });
    expect(id).toBe('notif_test_1');
  });

  it('acknowledgeNotification resolves when callable returns success', async () => {
    await expect(acknowledgeNotification('notif_test_1', 'uid_user_1')).resolves.toBeUndefined();
  });

  it('acknowledgeNotifications returns unreadCount number', async () => {
    const count = await acknowledgeNotifications(['notif_test_1'], 'uid_user_1');
    expect(typeof count).toBe('number');
  });
});
