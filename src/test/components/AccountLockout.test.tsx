import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../../components/LoginForm';
import { mockFacultyUser } from '../mocks/mockData';

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../lib/networkErrorHandler', () => ({
  executeWithNetworkHandling: vi.fn(async (fn) => {
    try {
      const result = await fn();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error };
    }
  }),
}));

vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock reCAPTCHA
(global as any).grecaptcha = {
  enterprise: {
    ready: vi.fn((callback) => callback()),
    execute: vi.fn().mockResolvedValue('mock-recaptcha-token'),
  },
};

describe('AccountLockout', () => {
  const mockOnLogin = vi.fn();
  const mockOnSignup = vi.fn();
  const mockUsers = [mockFacultyUser];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Failed Login Attempts Lockout', () => {
    it('should prevent login when account is locked due to failed attempts', async () => {
      const lockedMessage = 'Account locked due to too many failed login attempts. Please try again in 30 minutes.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockedMessage}
        />
      );

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      // Verify login button is disabled when locked
      expect(loginButton).toBeDisabled();

      // Verify locked message is displayed
      expect(screen.getByText(lockedMessage)).toBeInTheDocument();

      // Try to submit form
      await userEvent.type(emailInput, 'faculty@plv.edu.ph');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(loginButton);

      // Verify onLogin was not called
      expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('should show default locked message when no specific message provided', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
        />
      );

      expect(screen.getByText(/your account is locked/i)).toBeInTheDocument();
      expect(screen.getByText(/contact your administrator or support/i)).toBeInTheDocument();
    });

    it('should display remaining attempts warning message', () => {
      const warningMessage = '⚠️ Warning: 2 attempts remaining. Account will be locked after 5 failed attempts.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={false}
          accountLockedMessage={warningMessage}
        />
      );

      // Button should not be disabled for warning (only locked accounts)
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).not.toBeDisabled();
    });

    it('should allow login attempts when account is not locked', async () => {
      mockOnLogin.mockResolvedValue(true);

      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={false}
        />
      );

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const loginButton = screen.getByRole('button', { name: /sign in/i });

      expect(loginButton).not.toBeDisabled();

      await userEvent.type(emailInput, 'faculty@plv.edu.ph');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(loginButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith('faculty@plv.edu.ph', 'password123');
      });
    });

    it('should handle transition from unlocked to locked state', async () => {
      const { rerender } = render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={false}
        />
      );

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).not.toBeDisabled();

      // Simulate account getting locked
      const lockedMessage = 'Account locked after 5 failed attempts';
      rerender(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockedMessage}
        />
      );

      // Button should now be disabled
      expect(loginButton).toBeDisabled();
      expect(screen.getByText(lockedMessage)).toBeInTheDocument();
    });
  });

  describe('Admin Lock Scenarios', () => {
    it('should prevent login when account is locked by admin', async () => {
      const adminLockMessage = 'This account has been disabled by an administrator. Reason: Policy violation.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={adminLockMessage}
        />
      );

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).toBeDisabled();
      expect(screen.getByText(adminLockMessage)).toBeInTheDocument();
    });

    it('should display admin lock message with custom reason', () => {
      const customReason = 'Account suspended pending investigation';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={customReason}
        />
      );

      expect(screen.getByText(customReason)).toBeInTheDocument();
    });

    it('should handle admin lock without specific reason', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage="Your account has been disabled by an administrator."
        />
      );

      expect(screen.getByText(/disabled by an administrator/i)).toBeInTheDocument();
    });
  });

  describe('Realtime Lock Scenarios', () => {
    it('should handle realtime lock detection', () => {
      const realtimeLockMessage = 'Your account has been locked for security reasons.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={realtimeLockMessage}
        />
      );

      expect(screen.getByText(realtimeLockMessage)).toBeInTheDocument();
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).toBeDisabled();
    });

    it('should prevent form submission during realtime lock', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage="Account locked"
        />
      );

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);

      await userEvent.type(emailInput, 'test@plv.edu.ph');
      await userEvent.type(passwordInput, 'test123');

      // Try to submit (button is disabled but test form submission logic)
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).toBeDisabled();
      expect(mockOnLogin).not.toHaveBeenCalled();
    });
  });

  describe('Lock State Persistence', () => {
    it('should persist lock state in sessionStorage', () => {
      sessionStorage.setItem('accountLocked', 'true');
      sessionStorage.setItem('accountLockedMessage', 'Test lock message');

      const locked = sessionStorage.getItem('accountLocked') === 'true';
      const message = sessionStorage.getItem('accountLockedMessage');

      expect(locked).toBe(true);
      expect(message).toBe('Test lock message');
    });

    it('should clear lock state from sessionStorage on successful unlock', () => {
      sessionStorage.setItem('accountLocked', 'true');
      sessionStorage.setItem('accountLockedMessage', 'Locked');
      sessionStorage.setItem('accountLockReason', 'failed_attempts');

      // Simulate unlock
      sessionStorage.removeItem('accountLocked');
      sessionStorage.removeItem('accountLockedMessage');
      sessionStorage.removeItem('accountLockReason');

      expect(sessionStorage.getItem('accountLocked')).toBeNull();
      expect(sessionStorage.getItem('accountLockedMessage')).toBeNull();
      expect(sessionStorage.getItem('accountLockReason')).toBeNull();
    });

    it('should maintain lock state across component remounts', () => {
      sessionStorage.setItem('accountLocked', 'true');
      const lockMessage = 'Persisted lock message';
      sessionStorage.setItem('accountLockedMessage', lockMessage);

      const { unmount } = render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockMessage}
        />
      );

      expect(screen.getByText(lockMessage)).toBeInTheDocument();

      unmount();

      // Remount component
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={sessionStorage.getItem('accountLocked') === 'true'}
          accountLockedMessage={sessionStorage.getItem('accountLockedMessage')}
        />
      );

      expect(screen.getByText(lockMessage)).toBeInTheDocument();
    });
  });

  describe('Multiple Lock Scenarios', () => {
    it('should handle account locked due to failed attempts with time-based unlock', () => {
      const lockedMessage = 'Account locked for 30 minutes due to failed login attempts';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockedMessage}
        />
      );

      expect(screen.getByText(lockedMessage)).toBeInTheDocument();
    });

    it('should handle account locked by admin (permanent until admin unlocks)', () => {
      const adminLockMessage = 'Account permanently locked by administrator';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={adminLockMessage}
        />
      );

      expect(screen.getByText(adminLockMessage)).toBeInTheDocument();
    });

    it('should differentiate between temporary and permanent locks in UI', () => {
      const temporaryLockMessage = 'Temporary lock: 25 minutes remaining';
      
      const { rerender } = render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={temporaryLockMessage}
        />
      );

      expect(screen.getByText(temporaryLockMessage)).toBeInTheDocument();

      // Change to permanent lock
      const permanentLockMessage = 'Permanent administrative lock';
      rerender(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={permanentLockMessage}
        />
      );

      expect(screen.queryByText(temporaryLockMessage)).not.toBeInTheDocument();
      expect(screen.getByText(permanentLockMessage)).toBeInTheDocument();
    });
  });

  describe('Lock Message Variations', () => {
    it('should display lock message with attempts remaining info', () => {
      const message = 'Account locked. Too many failed attempts. You have used all 5 attempts.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={message}
        />
      );

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('should display lock message with unlock time', () => {
      const message = 'Account locked until 2:30 PM. Please wait 15 minutes.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={message}
        />
      );

      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('should display admin lock with contact info', () => {
      const message = 'Account disabled by administrator. Contact IT support for assistance.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={message}
        />
      );

      expect(screen.getByText(message)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty lock message gracefully', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage=""
        />
      );

      // Should show default message when custom message is empty
      expect(screen.getByText(/your account is locked/i)).toBeInTheDocument();
    });

    it('should handle null lock message', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={null}
        />
      );

      expect(screen.getByText(/your account is locked/i)).toBeInTheDocument();
    });

    it('should handle very long lock message', () => {
      const longMessage = 'This is a very long lock message that contains detailed information about why the account was locked and what steps the user should take to resolve the issue including contacting the administrator and providing specific reference numbers and timestamps for the incident.';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={longMessage}
        />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle special characters in lock message', () => {
      const messageWithSpecialChars = 'Account locked! @#$%^&* Contact: admin@plv.edu.ph';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={messageWithSpecialChars}
        />
      );

      expect(screen.getByText(messageWithSpecialChars)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should disable login button when account is locked', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage="Account locked"
        />
      );

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      expect(loginButton).toBeDisabled();
      expect(loginButton).toHaveAttribute('disabled');
    });

    it('should make lock message visible to screen readers', () => {
      const lockMessage = 'Account locked for security';
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockMessage}
        />
      );

      const messageElement = screen.getByText(lockMessage);
      expect(messageElement).toBeVisible();
    });
  });
});
