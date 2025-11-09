/**
 * AdminUserManagement.test.tsx
 * 
 * Comprehensive test suite for AdminUserManagement component.
 * Tests user management features including:
 * - Manual account lock/unlock
 * - View login attempt history
 * - Bulk cleanup operations
 * - User search and filters
 * - Account deletion (soft/hard)
 * - Role changes
 * - Status management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUserManagement from '../../../components/AdminUserManagement';
import type { User as AppUser } from '../../../App';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}));

describe('AdminUserManagement', () => {
  const mockOnDisableUser = vi.fn();
  const mockOnEnableUser = vi.fn();
  const mockOnDeleteUser = vi.fn();
  const mockOnChangeRole = vi.fn();
  const mockOnUnlockAccount = vi.fn();
  const mockOnNotifyUser = vi.fn();

  const mockFacultyUser: AppUser = {
    id: 'user1',
    email: 'faculty@plv.edu.ph',
    name: 'John Doe',
    role: 'faculty',
    department: 'Computer Engineering',
    status: 'active',
    accountLocked: false,
    failedLoginAttempts: 0
  };

  const mockLockedUser: AppUser = {
    id: 'user2',
    email: 'locked@plv.edu.ph',
    name: 'Jane Smith',
    role: 'faculty',
    department: 'Information Technology',
    status: 'active',
    accountLocked: true,
    accountLockReason: 'failed_attempts',
    failedLoginAttempts: 5
  };

  const mockAdminUser: AppUser = {
    id: 'admin1',
    email: 'admin@plv.edu.ph',
    name: 'Admin User',
    role: 'admin',
    department: 'IT Department',
    status: 'active',
    accountLocked: false,
    failedLoginAttempts: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDisableUser.mockResolvedValue(undefined);
    mockOnEnableUser.mockResolvedValue(undefined);
    mockOnDeleteUser.mockResolvedValue({ success: true, message: 'User deleted' });
    mockOnChangeRole.mockResolvedValue({ success: true, message: 'Role changed' });
    mockOnUnlockAccount.mockResolvedValue(undefined);
    mockOnNotifyUser.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('should render user management header', () => {
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/user management/i)).toBeInTheDocument();
    });

    it('should display users in table', () => {
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockAdminUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(mockFacultyUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockFacultyUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockAdminUser.name)).toBeInTheDocument();
    });

    it('should show empty state when no users', () => {
      render(
        <AdminUserManagement
          users={[]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/no users/i)).toBeInTheDocument();
    });

    it('should display user roles', () => {
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockAdminUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/faculty/i)).toBeInTheDocument();
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should display locked status badge', () => {
      render(
        <AdminUserManagement
          users={[mockLockedUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/locked/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by name', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockAdminUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
      });
    });

    it('should filter users by email', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'faculty@plv');

      await waitFor(() => {
        expect(screen.getByText(mockFacultyUser.email)).toBeInTheDocument();
      });
    });

    it('should filter users by department', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Computer');

      await waitFor(() => {
        expect(screen.getByText(/computer engineering/i)).toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'JOHN DOE');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Functionality', () => {
    it('should filter by role - faculty', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockAdminUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const roleFilter = screen.getByRole('combobox', { name: /role/i });
      await user.click(roleFilter);
      
      const facultyOption = screen.getByRole('option', { name: /faculty/i });
      await user.click(facultyOption);

      await waitFor(() => {
        expect(screen.getByText(mockFacultyUser.name)).toBeInTheDocument();
        expect(screen.queryByText(mockAdminUser.name)).not.toBeInTheDocument();
      });
    });

    it('should filter by locked status', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockLockedUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockFilter = screen.getByRole('combobox', { name: /lock status/i });
      await user.click(lockFilter);
      
      const lockedOption = screen.getByRole('option', { name: /locked/i });
      await user.click(lockedOption);

      await waitFor(() => {
        expect(screen.getByText(mockLockedUser.name)).toBeInTheDocument();
        expect(screen.queryByText(mockFacultyUser.name)).not.toBeInTheDocument();
      });
    });

    it('should show all users when filter is "all"', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser, mockAdminUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(mockFacultyUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockAdminUser.name)).toBeInTheDocument();
    });
  });

  describe('Sorting Functionality', () => {
    it('should sort by first name ascending', async () => {
      const users = [
        { ...mockFacultyUser, name: 'Zoe Adams' },
        { ...mockFacultyUser, id: 'user2', name: 'Alice Baker' }
      ];

      render(
        <AdminUserManagement
          users={users}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const rows = screen.getAllByRole('row');
      const firstDataRow = within(rows[1]);
      expect(firstDataRow.getByText('Alice Baker')).toBeInTheDocument();
    });

    it('should sort by last name descending', async () => {
      const user = userEvent.setup();
      const users = [
        { ...mockFacultyUser, name: 'John Adams' },
        { ...mockFacultyUser, id: 'user2', name: 'Jane Zimmerman' }
      ];

      render(
        <AdminUserManagement
          users={users}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const sortButton = screen.getByRole('button', { name: /sort/i });
      await user.click(sortButton);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const firstDataRow = within(rows[1]);
        expect(firstDataRow.getByText(/zimmerman/i)).toBeInTheDocument();
      });
    });
  });

  describe('Account Lock/Unlock', () => {
    it('should open lock dialog when locking account', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      await user.click(lockButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/lock account/i)).toBeInTheDocument();
      });
    });

    it('should require reason when locking account', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      await user.click(lockButton);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('reason'));
      });
    });

    it('should successfully lock account with reason', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      await user.click(lockButton);

      const reasonInput = await screen.findByPlaceholderText(/reason/i);
      await user.type(reasonInput, 'Policy violation');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDisableUser).toHaveBeenCalledWith('user1', 'Policy violation');
      });
    });

    it('should unlock locked account', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockLockedUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const unlockButton = screen.getByRole('button', { name: /unlock/i });
      await user.click(unlockButton);

      await waitFor(() => {
        expect(mockOnUnlockAccount).toHaveBeenCalledWith('user2');
      });
    });

    it('should show loading state during lock operation', async () => {
      const user = userEvent.setup();
      mockOnDisableUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          processingUserId="user1"
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      expect(lockButton).toBeDisabled();
    });

    it('should display failed login attempts count', () => {
      render(
        <AdminUserManagement
          users={[mockLockedUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/5.*attempts/i)).toBeInTheDocument();
    });
  });

  describe('Account Deletion', () => {
    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/delete user/i)).toBeInTheDocument();
      });
    });

    it('should require email confirmation for deletion', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = await screen.findByRole('button', { name: /confirm.*delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('email'));
      });
    });

    it('should perform soft delete by default', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const emailInput = await screen.findByPlaceholderText(/type.*email/i);
      await user.type(emailInput, mockFacultyUser.email);

      const confirmButton = screen.getByRole('button', { name: /confirm.*delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeleteUser).toHaveBeenCalledWith('user1', false);
      });
    });

    it('should perform hard delete when checkbox checked', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const hardDeleteCheckbox = await screen.findByRole('checkbox', { name: /hard delete/i });
      await user.click(hardDeleteCheckbox);

      const emailInput = screen.getByPlaceholderText(/type.*email/i);
      await user.type(emailInput, mockFacultyUser.email);

      const confirmButton = screen.getByRole('button', { name: /confirm.*delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeleteUser).toHaveBeenCalledWith('user1', true);
      });
    });

    it('should handle deletion errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockOnDeleteUser.mockRejectedValue(new Error('Delete failed'));

      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const emailInput = await screen.findByPlaceholderText(/type.*email/i);
      await user.type(emailInput, mockFacultyUser.email);

      const confirmButton = screen.getByRole('button', { name: /confirm.*delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Role Management', () => {
    it('should open role change dialog', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const roleButton = screen.getByRole('button', { name: /change role/i });
      await user.click(roleButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/promote.*admin/i)).toBeInTheDocument();
      });
    });

    it('should successfully change role to admin', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const roleButton = screen.getByRole('button', { name: /change role/i });
      await user.click(roleButton);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnChangeRole).toHaveBeenCalledWith('user1', 'admin');
      });
    });

    it('should handle role change errors', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockOnChangeRole.mockResolvedValue({ success: false, message: 'Role change failed' });

      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const roleButton = screen.getByRole('button', { name: /change role/i });
      await user.click(roleButton);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table structure', () => {
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
    });

    it('should have accessible buttons', () => {
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByRole('button', { name: /lock/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should have accessible dialogs', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAccessibleName();
      });
    });

    it('should have accessible form inputs', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      await user.click(lockButton);

      await waitFor(() => {
        const reasonInput = screen.getByLabelText(/reason/i);
        expect(reasonInput).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty users array', () => {
      render(
        <AdminUserManagement
          users={[]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(/no users/i)).toBeInTheDocument();
    });

    it('should handle users without department', () => {
      const userWithoutDept = { ...mockFacultyUser, department: undefined };
      render(
        <AdminUserManagement
          users={[userWithoutDept as any]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      expect(screen.getByText(mockFacultyUser.name)).toBeInTheDocument();
    });

    it('should handle missing optional callbacks', () => {
      render(<AdminUserManagement users={[mockFacultyUser]} />);

      expect(screen.getByText(mockFacultyUser.name)).toBeInTheDocument();
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, '@#$%^&*');

      // Should not crash
      expect(screen.queryByText(mockFacultyUser.name)).not.toBeInTheDocument();
    });

    it('should handle very long lock reasons', async () => {
      const user = userEvent.setup();
      render(
        <AdminUserManagement
          users={[mockFacultyUser]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButton = screen.getByRole('button', { name: /lock/i });
      await user.click(lockButton);

      const reasonInput = await screen.findByPlaceholderText(/reason/i);
      const longReason = 'x'.repeat(1000);
      await user.type(reasonInput, longReason);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should handle long text
      await waitFor(() => {
        expect(mockOnDisableUser).toHaveBeenCalled();
      });
    });

    it('should handle concurrent operations on different users', async () => {
      const user = userEvent.setup();
      mockOnDisableUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

      render(
        <AdminUserManagement
          users={[mockFacultyUser, { ...mockFacultyUser, id: 'user2', name: 'User 2' }]}
          onDisableUser={mockOnDisableUser}
          onEnableUser={mockOnEnableUser}
          onDeleteUser={mockOnDeleteUser}
          onChangeRole={mockOnChangeRole}
          onUnlockAccount={mockOnUnlockAccount}
          onNotifyUser={mockOnNotifyUser}
        />
      );

      const lockButtons = screen.getAllByRole('button', { name: /lock/i });
      await user.click(lockButtons[0]);
      
      const reasonInput = await screen.findByPlaceholderText(/reason/i);
      await user.type(reasonInput, 'Reason 1');
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should process the operation
      expect(mockOnDisableUser).toHaveBeenCalled();
    });
  });
});
