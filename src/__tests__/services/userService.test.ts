import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { userService } from '../../../lib/firebaseService';
import {
  mockGetDocs,
  mockGetDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  createMockUser,
  resetFirebaseMocks,
  createMockQuerySnapshot,
  createMockDocSnapshot,
} from '../__mocks__/firebase';
import { getDocs, getDoc, updateDoc, deleteDoc, doc, collection, query, where, orderBy } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((db, name) => ({ _path: name })),
  doc: vi.fn((db, coll, id) => ({ _path: `${coll}/${id}` })),
  getDocs: mockGetDocs,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  deleteDoc: mockDeleteDoc,
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  orderBy: vi.fn((field, dir) => ({ field, dir })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => Promise.resolve({ data: { success: true } })),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}));

vi.mock('../../../lib/firebaseService', async () => {
  const actual = await vi.importActual('../../../lib/firebaseService');
  return {
    ...actual,
    authService: {
      signOut: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('userService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getByEmail', () => {
    it('should retrieve user by email successfully', async () => {
      const mockUser = createMockUser({ email: 'test@plv.edu.ph' });
      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([{ id: 'user_1', data: mockUser }])
      );

      const result = await userService.getByEmail('test@plv.edu.ph');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@plv.edu.ph');
    });

    it('should return null when user not found', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await userService.getByEmail('nonexistent@plv.edu.ph');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should retrieve all users successfully', async () => {
      const users = [
        createMockUser({ id: 'user_1', name: 'User 1' }),
        createMockUser({ id: 'user_2', name: 'User 2' }),
      ];

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot([
          { id: 'user_1', data: users[0] },
          { id: 'user_2', data: users[1] },
        ])
      );

      const result = await userService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('User 1');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', name: 'Old Name' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const updatedUser = await userService.update('user_1', { name: 'New Name' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(updatedUser.name).toBe('New Name');
    });

    it('should update user role successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', role: 'faculty' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const updatedUser = await userService.update('user_1', { role: 'admin' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(updatedUser.role).toBe('admin');
    });
  });

  describe('lockUser', () => {
    it('should lock user account successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', accountLocked: false, role: 'faculty' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await userService.lockAccount('user_1', 30);

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.accountLocked).toBe(true);
    });

    it('should throw error when trying to lock admin account', async () => {
      const mockUser = createMockUser({ id: 'user_1', role: 'admin' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));

      await expect(userService.lockAccount('user_1', 30)).rejects.toThrow('Cannot lock admin accounts');
    });
  });

  describe('unlockUser', () => {
    it('should unlock user account successfully', async () => {
      const mockUser = createMockUser({
        id: 'user_1',
        accountLocked: true,
        lockedUntil: new Date().toISOString(),
      });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await userService.unlockAccount('user_1');

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.accountLocked).toBe(false);
    });
  });

  describe('getById', () => {
    it('should retrieve user by id successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', name: 'Test User' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));

      const result = await userService.getById('user_1');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test User');
    });

    it('should return null when user not found by id', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await userService.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update user status successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', status: 'pending' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const updatedUser = await userService.updateStatus('user_1', 'approved');

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(updatedUser.status).toBe('approved');
    });
  });

  describe('lockAccountByAdmin', () => {
    it('should lock user account by admin successfully', async () => {
      const mockUser = createMockUser({ id: 'user_1', accountLocked: false, role: 'faculty' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await userService.lockAccountByAdmin('user_1', 'Violation of policy');

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.accountLocked).toBe(true);
    });

    it('should throw error when trying to lock admin account by admin', async () => {
      const mockUser = createMockUser({ id: 'user_1', role: 'admin' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));

      await expect(userService.lockAccountByAdmin('user_1', 'Reason')).rejects.toThrow('Cannot lock admin accounts');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await userService.delete('user_1');

      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should handle errors when deleting user fails', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(userService.delete('user_1')).rejects.toThrow();
    });
  });

  describe('getAllUsers edge cases', () => {
    it('should return empty array when no users exist', async () => {
      mockGetDocs.mockResolvedValue(createMockQuerySnapshot([]));

      const result = await userService.getAll();

      expect(result).toHaveLength(0);
    });

    it('should handle large user lists', async () => {
      const users = Array.from({ length: 100 }, (_, i) =>
        createMockUser({ id: `user_${i}`, name: `User ${i}` })
      );

      mockGetDocs.mockResolvedValue(
        createMockQuerySnapshot(users.map((u, i) => ({ id: `user_${i}`, data: u })))
      );

      const result = await userService.getAll();

      expect(result).toHaveLength(100);
    });
  });

  describe('updateUser edge cases', () => {
    it('should handle partial updates', async () => {
      const mockUser = createMockUser({ id: 'user_1', name: 'Old Name', email: 'old@plv.edu.ph' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const updatedUser = await userService.update('user_1', { name: 'New Name' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(updatedUser.name).toBe('New Name');
    });

    it('should handle department updates', async () => {
      const mockUser = createMockUser({ id: 'user_1', department: 'CEIT' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const updatedUser = await userService.update('user_1', { department: 'CS' });

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(updatedUser.department).toBe('CS');
    });
  });

  describe('lockAccount edge cases', () => {
    it('should handle custom lock duration', async () => {
      const mockUser = createMockUser({ id: 'user_1', accountLocked: false, role: 'faculty' });
      mockGetDoc.mockResolvedValue(createMockDocSnapshot('user_1', mockUser));
      mockUpdateDoc.mockResolvedValue(undefined);

      const result = await userService.lockAccount('user_1', 60);

      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result.accountLocked).toBe(true);
    });

    it('should handle errors when user not found for lock', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(userService.lockAccount('non-existent', 30)).rejects.toThrow('User not found');
    });
  });

  describe('unlockAccount edge cases', () => {
    it('should handle errors when user not found for unlock', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(userService.unlockAccount('non-existent')).rejects.toThrow('User not found');
    });
  });
});

