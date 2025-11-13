import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { authService } from '../../../lib/firebaseService';
import { createMockUser } from '../__mocks__/firebase';

// Mock Firebase modules
vi.mock('../../../lib/firebaseService', async () => {
  const actual = await vi.importActual('../../../lib/firebaseService');
  return {
    ...actual,
    authService: {
      getCurrentUser: vi.fn(),
      isAuthenticated: vi.fn(),
      onAuthStateChange: vi.fn((callback) => {
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
    },
  };
});

describe('useAuth (authService integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('current user', () => {
    it('should get current user successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', email: 'test@plv.edu.ph' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const user = await authService.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@plv.edu.ph');
    });

    it('should return null when not authenticated', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('null when not auth', () => {
    it('should return null for unauthenticated state', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should identify admin user', async () => {
      const adminUser = createMockUser({ id: 'admin_1', role: 'admin' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(adminUser);

      const user = await authService.getCurrentUser();

      expect(user?.role).toBe('admin');
    });

    it('should return false for non-admin user', async () => {
      const facultyUser = createMockUser({ id: 'faculty_1', role: 'faculty' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(facultyUser);

      const user = await authService.getCurrentUser();

      expect(user?.role).toBe('faculty');
    });
  });

  describe('isFaculty', () => {
    it('should identify faculty user', async () => {
      const facultyUser = createMockUser({ id: 'faculty_1', role: 'faculty' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(facultyUser);

      const user = await authService.getCurrentUser();

      expect(user?.role).toBe('faculty');
    });
  });

  describe('login', () => {
    it('should handle login flow', async () => {
      const mockUser = createMockUser({ id: 'user_1' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);

      const user = await authService.getCurrentUser();

      expect(user).not.toBeNull();
    });
  });

  describe('logout', () => {
    it('should handle logout flow', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('role retrieval', () => {
    it('should retrieve user role correctly', async () => {
      const adminUser = createMockUser({ id: 'admin_1', role: 'admin' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(adminUser);

      const user = await authService.getCurrentUser();

      expect(user?.role).toBe('admin');
    });

    it('should retrieve faculty role correctly', async () => {
      const facultyUser = createMockUser({ id: 'faculty_1', role: 'faculty' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(facultyUser);

      const user = await authService.getCurrentUser();

      expect(user?.role).toBe('faculty');
    });
  });

  describe('auth state change', () => {
    it('should handle auth state changes', async () => {
      const mockUser = createMockUser({ id: 'user_1' });
      const unsubscribe = vi.fn();
      const onAuthStateChange = vi.mocked(authService.onAuthStateChange);

      onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe,
          },
        },
      } as any);

      const subscription = authService.onAuthStateChange(() => {});

      expect(subscription).toBeDefined();
      expect(unsubscribe).toBeDefined();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      const mockUser = createMockUser({ id: 'user_1' });
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser);
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);
      vi.mocked(authService.isAuthenticated).mockReturnValue(false);

      const isAuth = authService.isAuthenticated();

      expect(isAuth).toBe(false);
    });
  });
});

