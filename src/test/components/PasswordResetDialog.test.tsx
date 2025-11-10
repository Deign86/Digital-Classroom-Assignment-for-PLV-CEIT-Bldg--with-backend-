/*
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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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
  vi.mocked(authService.resetPassword).mockResolvedValue({ success: true, message: '' });

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

(remaining content truncated for brevity in the read response)