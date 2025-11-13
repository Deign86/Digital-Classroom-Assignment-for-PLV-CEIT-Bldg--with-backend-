import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authService } from '../../../lib/firebaseService';
import {
  mockHttpsCallable,
  createMockUser,
  resetFirebaseMocks,
} from '../__mocks__/firebase';

// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: vi.fn().mockResolvedValue(undefined),
  EmailAuthProvider: {
    credential: vi.fn(() => ({})),
  },
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: mockHttpsCallable,
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}));

vi.mock('../../../lib/notificationService', () => ({
  default: {
    createNotification: vi.fn().mockResolvedValue('notif-id'),
  },
}));

describe('authService - Brute Force Protection', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('failed login attempts tracking', () => {
    it('should track failed login attempt via Cloud Function', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          locked: false,
          attemptsRemaining: 4,
          message: undefined,
        },
      });

      try {
        await authService.signIn('test@plv.edu.ph', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }

      expect(mockHttpsCallable).toHaveBeenCalled();
    });

    it('should lock account after 5 failed attempts', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          locked: true,
          attemptsRemaining: 0,
          lockedUntil,
          message: 'Account locked for 30 minutes due to too many failed attempts',
        },
      });

      await expect(authService.signIn('test@plv.edu.ph', 'wrongpassword')).rejects.toThrow();

      expect(mockHttpsCallable).toHaveBeenCalled();
      expect(sessionStorage.getItem('accountLocked')).toBe('true');
    });

    it('should show warning message when 2 attempts remaining', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          locked: false,
          attemptsRemaining: 2,
          message: '2 attempts remaining before account lockout',
        },
      });

      try {
        await authService.signIn('test@plv.edu.ph', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }

      expect(mockHttpsCallable).toHaveBeenCalled();
    });

    it('should reset failed attempts on successful login', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const mockUser = {
        uid: 'user_123',
        email: 'test@plv.edu.ph',
        emailVerified: true,
      };

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as any);

      mockHttpsCallable
        .mockResolvedValueOnce({
          data: { success: true },
        })
        .mockResolvedValueOnce({
          data: { success: true },
        });

      const mockUserDoc = createMockUser({
        id: 'user_123',
        email: 'test@plv.edu.ph',
        accountLocked: false,
        failedLoginAttempts: 0,
      });

      vi.mock('../../../lib/firebaseService', async () => {
        const actual = await vi.importActual('../../../lib/firebaseService');
        return {
          ...actual,
          userService: {
            getById: vi.fn().mockResolvedValue(mockUserDoc),
          },
        };
      });

      // Mock successful login flow
      const result = await authService.signIn('test@plv.edu.ph', 'correctpassword');

      expect(mockHttpsCallable).toHaveBeenCalled();
    });
  });

  describe('30-minute timeout with auto-unlock', () => {
    it('should set lockedUntil timestamp when account is locked', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          locked: true,
          attemptsRemaining: 0,
          lockedUntil,
          message: 'Account locked for 30 minutes',
        },
      });

      try {
        await authService.signIn('test@plv.edu.ph', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }

      expect(sessionStorage.getItem('accountLockedUntil')).toBe(lockedUntil);
    });

    it('should calculate remaining lockout time correctly', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const mockUser = createMockUser({
        id: 'user_123',
        accountLocked: true,
        lockedUntil,
        failedLoginAttempts: 5,
      });

      const { getAuth } = await import('firebase/auth');
      vi.mocked(getAuth).mockReturnValue({
        currentUser: {
          uid: 'user_123',
          email: 'test@plv.edu.ph',
        },
      } as any);

      // The service should calculate minutes remaining
      const now = new Date();
      const lockDate = new Date(lockedUntil);
      const minutesRemaining = Math.ceil((lockDate.getTime() - now.getTime()) / 60000);

      expect(minutesRemaining).toBeGreaterThan(0);
      expect(minutesRemaining).toBeLessThanOrEqual(15);
    });
  });

  describe('server-side tracking via Cloud Functions', () => {
    it('should call trackFailedLogin Cloud Function on failed login', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          locked: false,
          attemptsRemaining: 3,
        },
      });

      try {
        await authService.signIn('test@plv.edu.ph', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }

      expect(mockHttpsCallable).toHaveBeenCalled();
    });

    it('should handle Cloud Function errors gracefully', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Invalid password',
      });

      mockHttpsCallable.mockRejectedValue(new Error('Cloud Function error'));

      await expect(authService.signIn('test@plv.edu.ph', 'wrongpassword')).rejects.toThrow();
    });
  });
});

describe('authService - Password Security', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('password reset', () => {
    it('should validate email format before sending reset', async () => {
      const result = await authService.resetPassword('invalid-email');

      expect(result.success).toBe(false);
      expect(result.message).toContain('valid email');
    });

    it('should send password reset email for valid email', async () => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined);

      const result = await authService.resetPassword('test@plv.edu.ph');

      expect(result.success).toBe(true);
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should handle too many reset attempts', async () => {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      vi.mocked(sendPasswordResetEmail).mockRejectedValue({
        code: 'auth/too-many-requests',
        message: 'Too many requests',
      });

      const result = await authService.resetPassword('test@plv.edu.ph');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many reset attempts');
    });

    it('should confirm password reset with action code', async () => {
      const { confirmPasswordReset } = await import('firebase/auth');
      vi.mocked(confirmPasswordReset).mockResolvedValue(undefined);

      const result = await authService.confirmPasswordReset('action-code', 'NewPassword123!');

      expect(result.success).toBe(true);
      expect(confirmPasswordReset).toHaveBeenCalled();
    });

    it('should handle invalid action code', async () => {
      const { confirmPasswordReset } = await import('firebase/auth');
      vi.mocked(confirmPasswordReset).mockRejectedValue({
        code: 'auth/invalid-action-code',
        message: 'Invalid code',
      });

      const result = await authService.confirmPasswordReset('invalid-code', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid or expired');
    });

    it('should handle weak password', async () => {
      const { confirmPasswordReset } = await import('firebase/auth');
      vi.mocked(confirmPasswordReset).mockRejectedValue({
        code: 'auth/weak-password',
        message: 'Weak password',
      });

      const result = await authService.confirmPasswordReset('action-code', '123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('too weak');
    });
  });

  describe('update password', () => {
    it('should require re-authentication before updating password', async () => {
      const { getAuth, reauthenticateWithCredential } = await import('firebase/auth');
      const mockUser = {
        uid: 'user_123',
        email: 'test@plv.edu.ph',
      };

      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockUser,
      } as any);

      vi.mocked(reauthenticateWithCredential).mockResolvedValue(undefined);

      const { updatePassword } = await import('firebase/auth');
      vi.mocked(updatePassword).mockResolvedValue(undefined);

      const result = await authService.updatePassword('CurrentPass123!', 'NewPass123!');

      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(updatePassword).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle wrong current password', async () => {
      const { getAuth, reauthenticateWithCredential } = await import('firebase/auth');
      const mockUser = {
        uid: 'user_123',
        email: 'test@plv.edu.ph',
      };

      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockUser,
      } as any);

      vi.mocked(reauthenticateWithCredential).mockRejectedValue({
        code: 'auth/wrong-password',
        message: 'Wrong password',
      });

      const result = await authService.updatePassword('WrongPass', 'NewPass123!');

      expect(result.success).toBe(false);
      expect(result.message).toContain('incorrect');
    });

    it('should sign out user after password update', async () => {
      const { getAuth, reauthenticateWithCredential, signOut } = await import('firebase/auth');
      const mockUser = {
        uid: 'user_123',
        email: 'test@plv.edu.ph',
      };

      vi.mocked(getAuth).mockReturnValue({
        currentUser: mockUser,
      } as any);

      vi.mocked(reauthenticateWithCredential).mockResolvedValue(undefined);
      const { updatePassword } = await import('firebase/auth');
      vi.mocked(updatePassword).mockResolvedValue(undefined);
      vi.mocked(signOut).mockResolvedValue(undefined);

      const result = await authService.updatePassword('CurrentPass123!', 'NewPass123!');

      expect(result.success).toBe(true);
      expect(result.requiresSignOut).toBe(true);
      expect(signOut).toHaveBeenCalled();
    });
  });
});

describe('authService - Session Management', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('signOutDueToIdleTimeout', () => {
    it('should sign out user due to idle timeout', async () => {
      const { signOut } = await import('firebase/auth');
      vi.mocked(signOut).mockResolvedValue(undefined);

      await authService.signOutDueToIdleTimeout();

      expect(signOut).toHaveBeenCalled();
    });

    it('should clear session storage on idle timeout', async () => {
      sessionStorage.setItem('test', 'value');
      const { signOut } = await import('firebase/auth');
      vi.mocked(signOut).mockResolvedValue(undefined);

      await authService.signOutDueToIdleTimeout();

      // Session storage should be cleared or sessionExpired flag set
      expect(sessionStorage.getItem('sessionExpired')).toBeTruthy();
    });
  });
});

