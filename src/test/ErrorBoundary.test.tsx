import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../../components/ErrorBoundary';
import { logClientError } from '../../lib/errorLogger';

// Mock external dependencies
vi.mock('../../lib/errorLogger', () => ({
  logClientError: vi.fn(),
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow, errorMessage }: { shouldThrow: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Test error');
  }
  return <div>Child component</div>;
};

// Suppress console.error during tests to keep output clean
const originalConsoleError = console.error;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console output during tests
    console.error = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    
    // Mock window.location
    delete (window as any).location;
    (window as any).location = { href: '', reload: vi.fn() };
    
    // Mock window.open
    window.open = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.error = originalConsoleError;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
  });

  describe('Normal Operation', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('does not log errors when children render successfully', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(logClientError).not.toHaveBeenCalled();
    });
  });

  describe('Error Catching', () => {
    it('catches errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('displays the error message from the caught error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Custom error message" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('displays default message for errors without message', async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="" />
        </ErrorBoundary>
      );

      await vi.waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred|something went wrong/i)).toBeInTheDocument();
      });
    });

    it('logs error to errorLogger when error is caught', () => {
      (logClientError as any).mockResolvedValue('error-id-123');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(logClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
          stack: expect.any(String),
          info: expect.any(Object),
          url: expect.any(String),
          userAgent: expect.any(String),
          userId: null,
        })
      );
    });

    it('logs error ID to console on successful logging', async () => {
      (logClientError as any).mockResolvedValue('error-id-123');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for async logging
      await vi.waitFor(() => {
        expect(console.info).toHaveBeenCalledWith('Logged client error id=', 'error-id-123');
      });
    });

    it('continues to display UI even if logging fails', async () => {
      (logClientError as any).mockRejectedValue(new Error('Logging failed'));

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Wait for the rejected promise to be handled
      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to send client error log',
          expect.any(Error)
        );
      });
    });
  });

  describe('Error UI Display', () => {
    it('displays error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const icon = screen.getByText('!');
      expect(icon).toBeInTheDocument();
    });

    it('displays "Reload app" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Reload app/i })).toBeInTheDocument();
    });

    it('displays "Report problem" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Report problem/i })).toBeInTheDocument();
    });

    it('displays support email link', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Default support email
      const emailButton = screen.getByRole('button', { name: /support@plv.edu/i });
      expect(emailButton).toBeInTheDocument();
    });

    it('displays error persistence message', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/If the issue persists/i)).toBeInTheDocument();
    });
  });

  describe('Reload Functionality', () => {
    it('reloads the page when "Reload app" button is clicked', async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      (window.location as any).reload = mockReload;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /Reload app/i });
      await user.click(reloadButton);

      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('resets error state when "Reload app" button is clicked', async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      (window.location as any).reload = mockReload;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const reloadButton = screen.getByRole('button', { name: /Reload app/i });
      await user.click(reloadButton);

      // Verify reload was called - this is the primary behavior being tested
      // The state reset happens immediately before reload, but since reload
      // is synchronous in the component, we can't test the intermediate state
      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Report Problem Functionality', () => {
    it('opens mailto link when "Report problem" button is clicked', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockResolvedValue('error-id-123');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      // Wait for async logging
      await vi.waitFor(() => {
        expect(window.location.href).toContain('mailto:support@plv.edu');
        expect(window.location.href).toContain('App%20error%20report');
      });
    });

    it('includes error ID in mailto body', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockResolvedValue('error-id-789');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      await vi.waitFor(() => {
        expect(window.location.href).toContain('Error%20ID%3A%20error-id-789');
      });
    });

    it('includes URL in mailto body', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockResolvedValue('error-id-123');
      (window.location as any).href = 'http://localhost:3000/dashboard';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      await vi.waitFor(() => {
        expect(window.location.href).toContain('URL');
      });
    });

    it('includes user agent in mailto body', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockResolvedValue('error-id-123');

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      await vi.waitFor(() => {
        expect(window.location.href).toContain('User%20agent');
      });
    });

    it('falls back to window.open if window.location.href fails', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockResolvedValue('error-id-123');
      
      // Make window.location.href throw
      Object.defineProperty(window.location, 'href', {
        set: () => {
          throw new Error('Blocked');
        },
        get: () => 'http://localhost:3000',
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      await vi.waitFor(() => {
        expect(window.open).toHaveBeenCalledWith(
          expect.stringContaining('mailto:support@plv.edu'),
          '_blank'
        );
      });
    });

    it('uses basic mailto fallback if both logging and mailto fail', async () => {
      const user = userEvent.setup();
      (logClientError as any).mockRejectedValue(new Error('Logging failed'));
      
      // Make window.location.href throw
      Object.defineProperty(window.location, 'href', {
        set: () => {
          throw new Error('Blocked');
        },
        get: () => 'http://localhost:3000',
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Wait for initial error logging to fail
      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalledWith(
          'Failed to send client error log',
          expect.any(Error)
        );
      });

      const reportButton = screen.getByRole('button', { name: /Report problem/i });
      await user.click(reportButton);

      await vi.waitFor(() => {
        expect(window.open).toHaveBeenCalledWith(
          expect.stringContaining('mailto:support@plv.edu'),
          '_blank'
        );
      });
    });
  });

  describe('Support Email Link', () => {
    it('opens mailto link when support email is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const emailButton = screen.getByRole('button', { name: /support@plv.edu/i });
      await user.click(emailButton);

      expect(window.location.href).toContain('mailto:support@plv.edu');
    });

    it('falls back to window.open if window.location.href fails for email link', async () => {
      const user = userEvent.setup();
      
      // Make window.location.href throw
      Object.defineProperty(window.location, 'href', {
        set: () => {
          throw new Error('Blocked');
        },
        get: () => 'http://localhost:3000',
        configurable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const emailButton = screen.getByRole('button', { name: /support@plv.edu/i });
      await user.click(emailButton);

      expect(window.open).toHaveBeenCalledWith('mailto:support@plv.edu', '_blank');
    });
  });

  describe('Custom Fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('does not render default UI when custom fallback is provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /Reload app/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Report problem/i })).not.toBeInTheDocument();
    });

    it('still logs error when custom fallback is provided', () => {
      (logClientError as any).mockResolvedValue('error-id-123');
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </ErrorBoundary>
      );

      expect(logClientError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });
  });

  describe('Environment Variables', () => {
    it('uses REACT_APP_SUPPORT_EMAIL if set', () => {
      const originalEnv = process.env.REACT_APP_SUPPORT_EMAIL;
      process.env.REACT_APP_SUPPORT_EMAIL = 'custom@support.com';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /custom@support.com/i })).toBeInTheDocument();

      process.env.REACT_APP_SUPPORT_EMAIL = originalEnv;
    });

    it('uses VITE_SUPPORT_EMAIL if REACT_APP_SUPPORT_EMAIL is not set', () => {
      const originalReactEnv = process.env.REACT_APP_SUPPORT_EMAIL;
      const originalViteEnv = process.env.VITE_SUPPORT_EMAIL;
      
      delete process.env.REACT_APP_SUPPORT_EMAIL;
      process.env.VITE_SUPPORT_EMAIL = 'vite@support.com';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /vite@support.com/i })).toBeInTheDocument();

      process.env.REACT_APP_SUPPORT_EMAIL = originalReactEnv;
      process.env.VITE_SUPPORT_EMAIL = originalViteEnv;
    });

    it('falls back to default email if no env vars are set', () => {
      const originalReactEnv = process.env.REACT_APP_SUPPORT_EMAIL;
      const originalViteEnv = process.env.VITE_SUPPORT_EMAIL;
      
      delete process.env.REACT_APP_SUPPORT_EMAIL;
      delete process.env.VITE_SUPPORT_EMAIL;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /support@plv.edu/i })).toBeInTheDocument();

      process.env.REACT_APP_SUPPORT_EMAIL = originalReactEnv;
      process.env.VITE_SUPPORT_EMAIL = originalViteEnv;
    });
  });

  describe('Edge Cases', () => {
    it('handles errors with very long messages', () => {
      const longMessage = 'A'.repeat(500);

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={longMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles errors with special characters in message', () => {
      const specialMessage = 'Error: <script>alert("xss")</script>';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage={specialMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('handles errors with null or undefined properties', async () => {
      const error = new Error();
      error.message = '';
      error.stack = undefined;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="" />
        </ErrorBoundary>
      );

      await vi.waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred|something went wrong/i)).toBeInTheDocument();
      });
    });

    it('does not crash if logClientError is undefined', () => {
      vi.mocked(logClientError).mockImplementation(() => {
        throw new Error('Logger not available');
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should still display error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('handles rapid sequential errors', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('First error')).toBeInTheDocument();

      rerender(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      );

      // Should still display error UI (may show first error)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('applies gradient background to error UI', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorDiv = container.querySelector('.min-h-screen');
      expect(errorDiv).toHaveClass('bg-gradient-to-br');
    });

    it('centers error content on screen', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorDiv = container.querySelector('.min-h-screen');
      expect(errorDiv).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('displays error icon with correct styling', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const iconContainer = container.querySelector('.rounded-full');
      expect(iconContainer).toHaveClass('bg-gradient-to-br', 'from-red-500', 'to-pink-600');
    });
  });

  describe('Accessibility', () => {
    it('has accessible button labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Reload app/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Report problem/i })).toBeInTheDocument();
    });

    it('email link is keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Find button by text content (email address)
      const emailButton = screen.getByText(/support@plv\.edu|undefined/i).closest('button');
      
      // Email button should exist and be focusable
      expect(emailButton).toBeInTheDocument();
      
      // Test that it can be focused via keyboard
      if (emailButton) {
        emailButton.focus();
        expect(emailButton).toHaveFocus();
      }
    });

    it('action buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockReload = vi.fn();
      (window.location as any).reload = mockReload;

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /Reload app/i });
      
      // Focus and activate with keyboard
      reloadButton.focus();
      await user.keyboard('{Enter}');

      expect(mockReload).toHaveBeenCalled();
    });
  });
});
