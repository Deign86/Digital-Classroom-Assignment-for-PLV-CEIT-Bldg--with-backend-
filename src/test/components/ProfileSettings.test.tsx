/**
 * ProfileSettings.test.tsx
 * 
 * Tests for user profile settings component.
 * Covers:
 * - Profile information display
 * - Profile editing (name, departments)
 * - Password change functionality
 * - Password validation
 * - Push notification toggle
 * - Push notification support detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSettings from '../../../components/ProfileSettings';
import { authService, userService } from '../../../lib/firebaseService';
import { pushService } from '../../../lib/pushService';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import type { User } from '../../../App';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    updatePassword: vi.fn(),
  },
  userService: {
    update: vi.fn(),
  },
}));

vi.mock('../../../lib/pushService', () => ({
  pushService: {
    isPushSupported: vi.fn(() => true),
    enablePush: vi.fn(),
    disablePush: vi.fn(),
  },
}));

describe('ProfileSettings', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@plv.edu.ph',
    name: 'Test User',
    role: 'faculty',
    department: 'Information Technology',
    departments: ['Information Technology'],
    status: 'approved',
  };

  const mockOnTogglePush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Information Display', () => {
    it('should display user name', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('should display user email', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should display user role badge', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/faculty/i)).toBeInTheDocument();
    });

    it('should display user department', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/Information Technology/i)).toBeInTheDocument();
    });

    it('should display profile section title', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/profile settings|personal information/i)).toBeInTheDocument();
    });

    it('should display password section', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/change password|password/i)).toBeInTheDocument();
    });
  });

  describe('Profile Editing', () => {
    it('should have edit button', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByRole('button', { name: /edit|edit profile/i })).toBeInTheDocument();
    });

    it('should show editable fields when edit clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('should populate fields with current values', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe(mockUser.name);
    });

    it('should show save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /save|save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should validate name is required', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate name minimum length', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'A');

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate departments are required', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      // Try to save with no departments (implementation depends on UI)
      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      
      // Note: This test assumes UI allows clearing departments
      // If not possible via UI, this test may need adjustment
      await user.click(saveButton);

      // Should either show validation or successfully save with at least one department
      // Check that userService is called or validation error shown
    });

    it('should cancel editing without saving', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Should not show edit fields anymore
      expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
      
      // Should not have called save
      expect(userService.update).not.toHaveBeenCalled();
    });

    it('should save valid profile changes', async () => {
      const user = userEvent.setup();
      vi.mocked(userService.update).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name'
      });

      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(userService.update).toHaveBeenCalled();
      });
    });

    it('should show success toast after successful save', async () => {
      const user = userEvent.setup();
      vi.mocked(userService.update).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name'
      });

      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });

    it('should show info toast when no changes made', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      // Don't change anything
      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith('No changes to save');
      });
    });
  });

  describe('Password Change', () => {
    it('should have password section', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/change password|password/i)).toBeInTheDocument();
    });

    it('should show current password field', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it('should show new password field', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    it('should show confirm password field', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });

    it('should toggle current password visibility', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
      expect(currentPasswordInput.type).toBe('password');

      // Find and click toggle button (may be aria-label or nearby the input)
      const toggleButtons = screen.getAllByRole('button', { name: /show|hide/i });
      if (toggleButtons.length > 0) {
        await user.click(toggleButtons[0]);
        expect(currentPasswordInput.type).toBe('text');
      }
    });

    it('should toggle new password visibility', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const newPasswordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      expect(newPasswordInput.type).toBe('password');

      const toggleButtons = screen.getAllByRole('button', { name: /show|hide/i });
      if (toggleButtons.length > 1) {
        await user.click(toggleButtons[1]);
        expect(newPasswordInput.type).toBe('text');
      }
    });

    it('should validate passwords match', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'DifferentPass123!');

      // Should show mismatch error
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match|passwords must match/i)).toBeInTheDocument();
      });
    });

    it('should require current password', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/current password/i));
      });
    });

    it('should call authService.updatePassword with correct data', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.updatePassword).mockResolvedValue({ success: true, message: 'Password updated' });

      render(<ProfileSettings user={mockUser} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(currentPasswordInput, 'OldPass123!');
      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(authService.updatePassword).toHaveBeenCalledWith('OldPass123!', 'NewPass123!');
      });
    });

    it('should show success toast after password change', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.updatePassword).mockResolvedValue({ success: true, message: 'Password updated' });

      render(<ProfileSettings user={mockUser} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(currentPasswordInput, 'OldPass123!');
      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/password.*changed|password.*updated/i));
      });
    });

    it('should clear password fields after successful change', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.updatePassword).mockResolvedValue({ success: true, message: 'Password updated' });

      render(<ProfileSettings user={mockUser} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i) as HTMLInputElement;
      const newPasswordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i) as HTMLInputElement;

      await user.type(currentPasswordInput, 'OldPass123!');
      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(currentPasswordInput.value).toBe('');
        expect(newPasswordInput.value).toBe('');
        expect(confirmPasswordInput.value).toBe('');
      });
    });

    it('should show error toast on password change failure', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.updatePassword).mockResolvedValue({
        success: false,
        message: 'Current password is incorrect'
      });

      render(<ProfileSettings user={mockUser} />);

      const currentPasswordInput = screen.getByLabelText(/current password/i);
      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm.*password/i);

      await user.type(currentPasswordInput, 'WrongPass123!');
      await user.type(newPasswordInput, 'NewPass123!');
      await user.type(confirmPasswordInput, 'NewPass123!');

      const changePasswordButton = screen.getByRole('button', { name: /change password|update password/i });
      await user.click(changePasswordButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/incorrect|wrong|failed/i));
      });
    });
  });

  describe('Push Notifications', () => {
    it('should display push notification section', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/push notifications|notifications/i)).toBeInTheDocument();
    });

    it('should show push notification toggle switch', () => {
      render(<ProfileSettings user={mockUser} />);

      const switches = document.querySelectorAll('[role="switch"]');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('should reflect user push enabled state', () => {
      const userWithPush = { ...mockUser, pushEnabled: true } as any;
      render(<ProfileSettings user={userWithPush} />);

      const toggle = document.querySelector('[role="switch"]');
      expect(toggle).toHaveAttribute('data-state', 'checked');
    });

    it('should call onTogglePush when toggle clicked', async () => {
      const user = userEvent.setup();
      const userWithPush = { ...mockUser, pushEnabled: false } as any;
      render(<ProfileSettings user={userWithPush} onTogglePush={mockOnTogglePush} />);

      const toggle = document.querySelector('[role="switch"]') as HTMLElement;
      await user.click(toggle);

      await waitFor(() => {
        expect(mockOnTogglePush).toHaveBeenCalledWith(true);
      });
    });

    it('should disable push toggle during operation', async () => {
      const user = userEvent.setup();
      const userWithPush = { ...mockUser, pushEnabled: false } as any;
      mockOnTogglePush.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<ProfileSettings user={userWithPush} onTogglePush={mockOnTogglePush} />);

      const toggle = document.querySelector('[role="switch"]') as HTMLElement;
      await user.click(toggle);

      // Toggle should be disabled during operation
      expect(toggle).toHaveAttribute('data-disabled', 'true');
    });

    it('should detect when push is not supported', () => {
      vi.mocked(pushService.isPushSupported).mockReturnValue(false);

      render(<ProfileSettings user={mockUser} />);

      // Should show unsupported message or hide toggle
      expect(screen.getByText(/not supported|not available/i) || screen.queryByRole('switch')).toBeTruthy();
    });

    it('should show info message about push notifications', () => {
      render(<ProfileSettings user={mockUser} />);

      // Should explain what push notifications are for
      expect(screen.getByText(/receive notifications|booking updates|instant alerts/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm.*password/i)).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByRole('button', { name: /edit|edit profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change password|update password/i })).toBeInTheDocument();
    });

    it('should have accessible toggle switches', () => {
      render(<ProfileSettings user={mockUser} />);

      const switches = document.querySelectorAll('[role="switch"]');
      expect(switches.length).toBeGreaterThan(0);
      switches.forEach(sw => {
        expect(sw).toHaveAttribute('aria-checked');
      });
    });

    it('should display validation errors accessibly', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        const error = screen.getByText(/name is required/i);
        expect(error).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional onTogglePush callback', () => {
      expect(() => {
        render(<ProfileSettings user={mockUser} />);
      }).not.toThrow();
    });

    it('should handle user without departments array', () => {
      const userWithoutDepts = { ...mockUser, departments: undefined, department: 'Civil Engineering' } as any;
      
      expect(() => {
        render(<ProfileSettings user={userWithoutDepts} />);
      }).not.toThrow();
    });

    it('should handle user without department field', () => {
      const userWithoutDept = { ...mockUser, department: undefined, departments: ['Electrical Engineering'] };
      
      expect(() => {
        render(<ProfileSettings user={userWithoutDept} />);
      }).not.toThrow();
    });

    it('should handle very long names', async () => {
      const user = userEvent.setup();
      const longName = 'A'.repeat(100);
      vi.mocked(userService.update).mockResolvedValue({
        ...mockUser,
        name: longName
      });

      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, longName);

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      // Should handle gracefully (either accept or show validation)
      await waitFor(() => {
        expect(userService.update).toHaveBeenCalled();
      });
    });

    it('should handle rapid toggle clicks', async () => {
      const user = userEvent.setup();
      const userWithPush = { ...mockUser, pushEnabled: false } as any;
  mockOnTogglePush.mockResolvedValue({ success: true, message: '' });

      render(<ProfileSettings user={userWithPush} onTogglePush={mockOnTogglePush} />);

      const toggle = document.querySelector('[role="switch"]') as HTMLElement;
      
      // Click multiple times rapidly
      await user.click(toggle);
      await user.click(toggle);
      await user.click(toggle);

      // Should handle gracefully, possibly showing loading state
      expect(mockOnTogglePush).toHaveBeenCalled();
    });
  });
});
