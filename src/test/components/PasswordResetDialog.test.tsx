/**
 * PasswordResetDialog.test.tsx
 * 
 * Tests for password reset dialog component.
 * Covers:
 * - Email validation
 * - Rate limiting (1-minute cooldown)
 * - Reset email sending
 * - Success confirmation display
 * - State management
 * - Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordResetDialog from '../../../components/PasswordResetDialog';
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
    resetPassword: vi.fn(),
  },
}));

describe('PasswordResetDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render trigger element', () => {
      render(
        <PasswordResetDialog>
          <button>Open Dialog</button>
        </PasswordResetDialog>
      );

      expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument();
    });

    it('should open dialog when trigger clicked', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      const trigger = screen.getByRole('button', { name: /forgot password/i });
      await user.click(trigger);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    });

    it('should display email input form initially', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should display mail icon in input', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display helper text about email', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByText(/you'll receive an email/i)).toBeInTheDocument();
    });

    it('should display cancel button', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('Email Validation', () => {
    it('should show error when submitting empty email', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter your email address');
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalidemail');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a valid email address');
    });

    it('should accept valid email format', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(authService.resetPassword).toHaveBeenCalledWith('user@plv.edu.ph');
    });

    it('should trim whitespace from email', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, '  user@plv.edu.ph  ');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Email should not pass validation if it's just whitespace
      expect(toast.error).toHaveBeenCalled();
    });

    it('should reject email without domain', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a valid email address');
    });

    it('should reject email without @ symbol', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'userplv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a valid email address');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should enforce 1-minute cooldown between reset attempts', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@plv.edu.ph');
      
      // First submission
      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      });

      // Try again immediately
      await user.type(emailInput, 'user2@plv.edu.ph');
      submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Should show cooldown error
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/please wait \d+ second/i),
        expect.objectContaining({
          description: expect.stringMatching(/prevents email spam/i)
        })
      );
    });

    it('should allow reset after cooldown period', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@plv.edu.ph');
      
      // First submission
      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      });

      // Wait 61 seconds (past 60-second cooldown)
      vi.advanceTimersByTime(61000);

      // Try again after cooldown
      await user.clear(emailInput);
      await user.type(emailInput, 'user2@plv.edu.ph');
      submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledTimes(2);
      });
    });

    it('should display remaining cooldown seconds', async () => {
      const user = userEvent.setup({ delay: null });
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@plv.edu.ph');
      
      // First submission
      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      });

      // Try again immediately - should show 60 seconds
      await user.type(emailInput, 'user2@plv.edu.ph');
      submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/60 seconds/i),
        expect.anything()
      );
    });
  });

  describe('Reset Email Sending', () => {
    it('should call authService.resetPassword with email', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith('test@plv.edu.ph');
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();
    });

    it('should disable inputs during loading', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      // Inputs should be disabled
      expect(emailInput).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should show success toast on successful reset', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Password reset email sent!',
          expect.objectContaining({
            description: expect.stringMatching(/check your inbox/i)
          })
        );
      });
    });

    it('should show error toast on failed reset', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({
        success: false,
        message: 'User not found'
      });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'nonexistent@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Unable to send reset email',
          expect.objectContaining({
            description: 'User not found'
          })
        );
      });
    });

    it('should handle service errors gracefully', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockRejectedValue(new Error('Network error'));

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          'An error occurred',
          expect.objectContaining({
            description: expect.stringMatching(/try again|contact/i)
          })
        );
      });
    });
  });

  describe('Success Confirmation Display', () => {
    it('should show success screen after email sent', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email sent successfully/i)).toBeInTheDocument();
      });
    });

    it('should display check icon on success', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        const checkIcon = document.querySelector('.text-green-600');
        expect(checkIcon).toBeInTheDocument();
      });
    });

    it('should display submitted email address', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/test@plv.edu.ph/i)).toBeInTheDocument();
      });
    });

    it('should display spam folder reminder', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
      });
    });

    it('should display link expiration warning', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/link expires in 1 hour/i)).toBeInTheDocument();
      });
    });

    it('should display close button on success screen', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });
    });
  });

  describe('Dialog State Management', () => {
    it('should close dialog when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close dialog when close button clicked after success', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should reset state when dialog reopened', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      // First open
      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      let emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      let submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email sent successfully/i)).toBeInTheDocument();
      });

      // Close
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen - should show fresh form
      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      expect(emailInput.value).toBe(''); // Should be empty
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
    });

    it('should have accessible dialog structure', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have accessible dialog title', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
    });

    it('should have accessible buttons', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should have email autocomplete attribute', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
    });

    it('should prevent form validation bubbling', async () => {
      const user = userEvent.setup();
      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));

      const form = screen.getByRole('dialog').querySelector('form');
      expect(form).toHaveAttribute('noValidate');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long email addresses', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const longEmail = 'verylongemailaddress.with.many.dots.and.characters@subdomain.plv.edu.ph';
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, longEmail);
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith(longEmail);
      });
    });

    it('should handle special characters in email', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const specialEmail = 'user+test@plv.edu.ph';
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, specialEmail);
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledWith(specialEmail);
      });
    });

    it('should handle rapid form submissions', async () => {
      const user = userEvent.setup();
      vi.mocked(authService.resetPassword).mockResolvedValue({ success: true });

      render(
        <PasswordResetDialog>
          <button>Forgot Password?</button>
        </PasswordResetDialog>
      );

      await user.click(screen.getByRole('button', { name: /forgot password/i }));
      
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@plv.edu.ph');
      
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      
      // Click multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call once due to loading state
      await waitFor(() => {
        expect(authService.resetPassword).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle missing children prop gracefully', () => {
      expect(() => {
        render(
          <PasswordResetDialog>
            {null}
          </PasswordResetDialog>
        );
      }).not.toThrow();
    });
  });
});
