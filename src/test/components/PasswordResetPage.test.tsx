/**
 * PasswordResetPage.test.tsx
 * 
 * Tests for password reset page component.
 * Covers:
 * - URL parameter validation (oobCode)
 * - Password strength indicator
 * - Password validation rules
 * - Password sanitization
 * - Password visibility toggles
 * - Confirm password matching
 * - Link expiration handling
 * - Success/error flows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordResetPage from '../../../components/PasswordResetPage';
import { authService } from '../../../lib/firebaseService';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    confirmPasswordReset: vi.fn(),
  },
}));

describe('PasswordResetPage', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  
  // Store original window.location
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.location
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?oobCode=valid-action-code-12345',
    };
  });

  afterEach(() => {
    // Restore original window.location
    window.location = originalLocation;
  });

  describe('Component Rendering', () => {
    it('should render password reset form with valid link', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('should display lock icon', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display password strength requirements', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/uppercase and lowercase/i)).toBeInTheDocument();
      expect(screen.getByText(/at least one number/i)).toBeInTheDocument();
      expect(screen.getByText(/at least one special character/i)).toBeInTheDocument();
    });

    it('should display cancel button', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should display reset button', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });
  });

  describe('Link Validation', () => {
    it('should show error screen when oobCode missing', () => {
      // Mock URL without oobCode
      window.location = {
        ...originalLocation,
        search: '',
      };

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText(/link expired/i)).toBeInTheDocument();
      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Link',
        expect.objectContaining({
          description: expect.stringMatching(/no action code|invalid|expired/i)
        })
      );
    });

    it('should display expiration message on invalid link', () => {
      window.location = {
        ...originalLocation,
        search: '',
      };

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByText(/expire after 1 hour/i)).toBeInTheDocument();
    });

    it('should show back to login button on expired link', () => {
      window.location = {
        ...originalLocation,
        search: '',
      };

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });

    it('should call onCancel when back to login clicked', async () => {
      const user = userEvent.setup();
      window.location = {
        ...originalLocation,
        search: '',
      };

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should extract oobCode from URL parameters', () => {
      window.location = {
        ...originalLocation,
        search: '?oobCode=abc123&mode=resetPassword',
      };

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Should show form, not error screen
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });
  });

  describe('Password Strength Indicator', () => {
    it('should show weak strength for short password', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'weak');

      await waitFor(() => {
        expect(screen.getByText(/weak/i)).toBeInTheDocument();
      });
    });

    it('should show fair strength for medium password', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Password1');

      await waitFor(() => {
        expect(screen.getByText(/fair/i)).toBeInTheDocument();
      });
    });

    it('should show good strength for strong password', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Password123!');

      await waitFor(() => {
        expect(screen.getByText(/good|strong/i)).toBeInTheDocument();
      });
    });

    it('should show visual strength bar', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'Test123!');

      await waitFor(() => {
        const strengthBar = document.querySelector('.bg-gray-200');
        expect(strengthBar).toBeInTheDocument();
      });
    });

    it('should update strength bar color based on strength', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      
      // Weak password
      await user.type(passwordInput, 'weak');
      await waitFor(() => {
        expect(document.querySelector('.bg-red-500')).toBeInTheDocument();
      });

      await user.clear(passwordInput);

      // Strong password
      await user.type(passwordInput, 'StrongPass123!');
      await waitFor(() => {
        expect(document.querySelector('.bg-green-500, .bg-yellow-500')).toBeInTheDocument();
      });
    });

    it('should highlight met requirements in green', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'ValidPass123!');

      await waitFor(() => {
        const greenItems = document.querySelectorAll('.text-green-600');
        expect(greenItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Password Validation', () => {
    it('should require at least 8 characters', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'Short1!');
      await user.type(confirmInput, 'Short1!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Password',
        expect.objectContaining({
          description: expect.stringMatching(/8 characters/i)
        })
      );
    });

    it('should require uppercase letter', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'lowercase123!');
      await user.type(confirmInput, 'lowercase123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Password',
        expect.objectContaining({
          description: expect.stringMatching(/uppercase/i)
        })
      );
    });

    it('should require lowercase letter', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'UPPERCASE123!');
      await user.type(confirmInput, 'UPPERCASE123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Password',
        expect.objectContaining({
          description: expect.stringMatching(/lowercase/i)
        })
      );
    });

    it('should require at least one number', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NoNumbers!');
      await user.type(confirmInput, 'NoNumbers!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Password',
        expect.objectContaining({
          description: expect.stringMatching(/number/i)
        })
      );
    });

    it('should require special character', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NoSpecial123');
      await user.type(confirmInput, 'NoSpecial123');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        'Invalid Password',
        expect.objectContaining({
          description: expect.stringMatching(/special character/i)
        })
      );
    });

    it('should accept valid password', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmInput, 'ValidPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.confirmPasswordReset).toHaveBeenCalled();
      });
    });
  });

  describe('Password Matching', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmInput, 'DifferentPass123!');

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmInput, 'DifferentPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when passwords match', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmInput, 'ValidPass123!');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should show toast error on form submission with mismatched passwords', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'ValidPass123!');
      await user.type(confirmInput, 'ValidPass123!');
      
      // Change confirm password
      await user.clear(confirmInput);
      await user.type(confirmInput, 'DifferentPass123!');
      
      // Try to submit via Enter key (button will be disabled, but test form validation)
      const form = screen.getByRole('button', { name: /reset password/i }).closest('form');
      if (form) {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      }

      // Should still show mismatch error if somehow submitted
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggles', () => {
    it('should toggle new password visibility', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      const toggleButton = screen.getByLabelText(/show new password|hide new password/i);

      expect(passwordInput.type).toBe('password');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('text');

      await user.click(toggleButton);
      expect(passwordInput.type).toBe('password');
    });

    it('should toggle confirm password visibility independently', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const confirmInput = screen.getByLabelText(/confirm new password/i) as HTMLInputElement;
      const toggleButton = screen.getByLabelText(/show confirm password|hide confirm password/i);

      expect(confirmInput.type).toBe('password');

      await user.click(toggleButton);
      expect(confirmInput.type).toBe('text');

      await user.click(toggleButton);
      expect(confirmInput.type).toBe('password');
    });

    it('should show eye icon when password hidden', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const eyeIcons = document.querySelectorAll('svg');
      expect(eyeIcons.length).toBeGreaterThan(0);
    });

    it('should update aria-pressed on toggle', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const toggleButton = screen.getByLabelText(/show new password|hide new password/i);

      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Password Reset Submission', () => {
    it('should call confirmPasswordReset with action code and password', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
          'valid-action-code-12345',
          'NewPass123!'
        );
      });
    });

    it('should sanitize password before submission', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      // Type password with whitespace (simulating paste)
      await user.type(passwordInput, '  NewPass123!  ');
      await user.type(confirmInput, '  NewPass123!  ');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Should be called with trimmed password
        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
          'valid-action-code-12345',
          'NewPass123!'
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /resetting/i })).toBeInTheDocument();
    });

    it('should disable inputs during loading', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      expect(passwordInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();
    });

    it('should show success toast and call onSuccess', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Password reset successful!',
          expect.objectContaining({
            description: expect.stringMatching(/log in with your new password/i)
          })
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should show error toast on failed reset', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({
        success: false,
        message: 'Invalid action code'
      });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Failed to reset password',
          expect.objectContaining({
            description: 'Invalid action code'
          })
        );
      });
    });

    it('should handle service errors gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockRejectedValue(new Error('Network error'));

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/error occurred/i)
        );
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not submit form when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      await user.type(passwordInput, 'NewPass123!');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(authService.confirmPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    });

    it('should have accessible visibility toggle buttons', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      expect(screen.getByLabelText(/show new password|hide new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show confirm password|hide confirm password/i)).toBeInTheDocument();
    });

    it('should have aria-pressed on toggle buttons', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const toggleButton = screen.getByLabelText(/show new password|hide new password/i);
      expect(toggleButton).toHaveAttribute('aria-pressed');
    });

    it('should have title attributes on toggle buttons', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const toggleButton = screen.getByLabelText(/show new password|hide new password/i);
      expect(toggleButton).toHaveAttribute('title');
    });

    it('should have required attributes on password inputs', () => {
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);

      expect(passwordInput).toBeRequired();
      expect(confirmInput).toBeRequired();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty password submission gracefully', async () => {
      const user = userEvent.setup();
      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      // Form should not submit with empty passwords
      expect(authService.confirmPasswordReset).not.toHaveBeenCalled();
    });

    it('should handle very long passwords', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const longPassword = 'VeryLongP@ssw0rd'.repeat(10); // 160+ chars
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, longPassword);
      await user.type(confirmInput, longPassword);
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
          'valid-action-code-12345',
          longPassword
        );
      });
    });

    it('should handle special characters in password', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const specialPassword = 'P@$$w0rd!#%&*()';
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, specialPassword);
      await user.type(confirmInput, specialPassword);
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
          'valid-action-code-12345',
          specialPassword
        );
      });
    });

    it('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, 'NewPass123!');
      await user.type(confirmInput, 'NewPass123!');
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      
      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only submit once due to loading state
      await waitFor(() => {
        expect(authService.confirmPasswordReset).toHaveBeenCalledTimes(1);
      });
    });

    it('should sanitize zero-width characters from password', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.confirmPasswordReset).mockResolvedValue({ success: true });

      render(<PasswordResetPage onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      const passwordWithZeroWidth = 'NewPass\u200B123!'; // Zero-width space
      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm new password/i);
      
      await user.type(passwordInput, passwordWithZeroWidth);
      await user.type(confirmInput, passwordWithZeroWidth);
      
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Should be called with sanitized password (zero-width removed)
        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(
          'valid-action-code-12345',
          'NewPass123!'
        );
      });
    });
  });
});
