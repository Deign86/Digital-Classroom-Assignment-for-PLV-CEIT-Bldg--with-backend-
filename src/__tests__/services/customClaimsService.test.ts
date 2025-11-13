import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCurrentUserClaims,
  isCurrentUserAdmin,
  refreshMyCustomClaims,
  setUserCustomClaims,
  changeUserRole,
  checkClaimsSyncStatus,
} from '../../../lib/customClaimsService';
import { mockAuthUser, mockHttpsCallable, resetFirebaseMocks } from '../__mocks__/firebase';

// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: mockAuthUser,
  })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseApp: vi.fn(() => ({})),
}));

describe('customClaimsService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getRole', () => {
    it('should get current user claims successfully', async () => {
      const claims = await getCurrentUserClaims();

      expect(claims).not.toBeNull();
      expect(claims?.role).toBe('faculty');
    });

    it('should return null when no user is signed in', async () => {
      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: null,
      } as any);

      const claims = await getCurrentUserClaims();

      expect(claims).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return false for faculty user', async () => {
      const isAdmin = await isCurrentUserAdmin();

      expect(isAdmin).toBe(false);
    });

    it('should return true for admin user', async () => {
      const mockAdminUser = {
        ...mockAuthUser,
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: true, role: 'admin' },
          token: 'mock-token',
        }),
      };

      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockAdminUser,
      } as any);

      const isAdmin = await isCurrentUserAdmin();

      expect(isAdmin).toBe(true);
    });
  });

  describe('isFaculty', () => {
    it('should check if user is faculty based on role claim', async () => {
      const claims = await getCurrentUserClaims();

      expect(claims?.role).toBe('faculty');
    });
  });

  describe('hasPermission', () => {
    it('should check claims sync status correctly', async () => {
      const status = await checkClaimsSyncStatus('faculty');

      expect(status).toHaveProperty('inSync');
      expect(status).toHaveProperty('firestoreRole');
    });

    it('should detect when claims are out of sync', async () => {
      const mockAdminUser = {
        ...mockAuthUser,
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: false, role: 'faculty' },
          token: 'mock-token',
        }),
      };

      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockAdminUser,
      } as any);

      const status = await checkClaimsSyncStatus('admin');

      expect(status.inSync).toBe(false);
    });
  });

  describe('refreshMyCustomClaims', () => {
    it('should refresh custom claims successfully', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { success: true } });

      await expect(refreshMyCustomClaims()).resolves.not.toThrow();
    });
  });

  describe('setUserCustomClaims', () => {
    it('should set custom claims for user successfully', async () => {
      mockHttpsCallable.mockResolvedValue({ data: { success: true } });

      await expect(setUserCustomClaims('user_123')).resolves.not.toThrow();
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, message: 'Role updated successfully' },
      });

      const result = await changeUserRole('user_123', 'admin');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Role updated successfully');
    });

    it('should change user role to faculty successfully', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, message: 'Role updated successfully' },
      });

      const result = await changeUserRole('user_123', 'faculty');

      expect(result.success).toBe(true);
    });
  });

  describe('forceTokenRefresh', () => {
    it('should refresh token successfully when user is signed in', async () => {
      const mockUser = {
        ...mockAuthUser,
        getIdToken: vi.fn().mockResolvedValue('new-token'),
      };

      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockUser,
      } as any);

      const { forceTokenRefresh } = await import('../../../lib/customClaimsService');
      await expect(forceTokenRefresh()).resolves.not.toThrow();
    });

    it('should throw error when no user is signed in', async () => {
      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: null,
      } as any);

      const { forceTokenRefresh } = await import('../../../lib/customClaimsService');
      await expect(forceTokenRefresh()).rejects.toThrow('No user is currently signed in');
    });

    it('should handle token refresh errors', async () => {
      const mockUser = {
        ...mockAuthUser,
        getIdToken: vi.fn().mockRejectedValue(new Error('Token refresh failed')),
      };

      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockUser,
      } as any);

      const { forceTokenRefresh } = await import('../../../lib/customClaimsService');
      await expect(forceTokenRefresh()).rejects.toThrow();
    });
  });

  describe('changeUserRole edge cases', () => {
    it('should handle invalid role changes', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: false, message: 'Invalid role' },
      });

      const result = await changeUserRole('user_123', 'invalid_role' as any);

      expect(result.success).toBe(false);
    });

    it('should handle errors when changing role fails', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Role change failed'));

      await expect(changeUserRole('user_123', 'admin')).rejects.toThrow();
    });
  });

  describe('setUserCustomClaims edge cases', () => {
    it('should handle errors when setting claims fails', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Set claims failed'));

      await expect(setUserCustomClaims('user_123')).rejects.toThrow();
    });
  });

  describe('refreshMyCustomClaims edge cases', () => {
    it('should handle errors when refresh fails', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Refresh failed'));

      await expect(refreshMyCustomClaims()).rejects.toThrow();
    });
  });
});

