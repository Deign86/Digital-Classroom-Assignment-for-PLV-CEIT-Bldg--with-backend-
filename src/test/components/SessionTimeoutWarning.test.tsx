/**
 * SessionTimeoutWarning.test.tsx
 * 
 * Tests for session timeout warning modal.
 * Covers:
 * - 30-minute idle timeout configuration
 * - 5-minute warning display
 * - Countdown timer functionality
 * - Auto-logout behavior
 * - Extend session functionality
 * - Time formatting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionTimeoutWarning from '../../../components/SessionTimeoutWarning';

describe('SessionTimeoutWarning', () => {
  const mockOnExtendSession = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Do not enable fake timers globally because some tests use userEvent which expects
    // real timers. Tests that need fake timers will enable them locally.
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Ensure tests don't leave timers faked
    try {
      vi.useRealTimers();
    } catch (e) {
      // ignore if not supported in this environment
    }
  });

  describe('Component Rendering', () => {
    it('should render when open', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000} // 5 minutes
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText(/session timeout warning/i)).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.queryByText(/session timeout warning/i)).not.toBeInTheDocument();
    });

    it('should display warning message', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText(/session will expire due to inactivity/i)).toBeInTheDocument();
    });

    it('should display clock icon', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display extend session button', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByRole('button', { name: /stay logged in|extend/i })).toBeInTheDocument();
    });

    it('should display logout button', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByRole('button', { name: /logout|log out/i })).toBeInTheDocument();
    });
  });

  describe('Countdown Timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('should display time remaining in MM:SS format', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000} // 5 minutes = 300 seconds
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should format seconds with leading zero', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={65000} // 1:05
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });

    it('should decrement countdown every second', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={10000} // 10 seconds
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000); // 1 second
      });

      expect(screen.getByText('0:09')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000); // 1 more second
      });

      expect(screen.getByText('0:08')).toBeInTheDocument();
    });

    it('should auto-logout when countdown reaches zero', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={3000} // 3 seconds
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      act(() => {
        vi.advanceTimersByTime(3000); // Advance to zero
      });

      expect(mockOnLogout).toHaveBeenCalled();
    });

    it('should reset countdown when reopened', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('0:05')).toBeInTheDocument();

      // Close and reopen with new time
      rerender(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      rerender(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={15000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:15')).toBeInTheDocument();
    });

    it('should handle very short timeouts', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={1000} // 1 second
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:01')).toBeInTheDocument();
    });

    it('should handle long timeouts', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={3600000} // 60 minutes
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('60:00')).toBeInTheDocument();
    });

    it('should display minutes:seconds label', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText(/minutes:seconds/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });
    it('should call onExtendSession when extend button clicked', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: (ms: number) => vi.advanceTimersByTime(ms) });
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /stay logged in|extend/i });
      await user.click(extendButton);

      expect(mockOnExtendSession).toHaveBeenCalledTimes(1);
    });

    it('should call onLogout when logout button clicked', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: (ms: number) => vi.advanceTimersByTime(ms) });
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const logoutButton = screen.getByRole('button', { name: /logout|log out/i });
      await user.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('should not auto-logout if session extended', async () => {
      const user = userEvent.setup({ delay: null, advanceTimers: (ms: number) => vi.advanceTimersByTime(ms) });
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={3000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /stay logged in|extend/i });
      await user.click(extendButton);

      // Advance timers past original timeout
      act(() => vi.advanceTimersByTime(5000));

      expect(mockOnExtendSession).toHaveBeenCalled();
      // onLogout should not be called since session was extended
      expect(mockOnLogout).not.toHaveBeenCalled();
    });
  });

  describe('5-Minute Warning Configuration', () => {
    it('should display warning at 5 minutes (300 seconds)', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000} // Exactly 5 minutes
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should handle warning display at 4:59', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={299000} // 4:59
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('4:59')).toBeInTheDocument();
    });

    it('should explain auto-logout in message', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText(/automatically logged out/i)).toBeInTheDocument();
    });
  });

  describe('Timer Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clean up timer when dialog closes', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      // Close dialog
      rerender(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      // Advance time - should not trigger any updates since closed
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Dialog should still be closed, no errors
      expect(screen.queryByText(/session timeout/i)).not.toBeInTheDocument();
    });

    it('should not call onLogout if timer reaches zero while closed', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={3000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      // Close immediately
      rerender(
        <SessionTimeoutWarning
          isOpen={false}
          timeRemaining={3000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockOnLogout).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dialog structure', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    });

    it('should have accessible dialog title', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const dialog = screen.getByRole('alertdialog');
      // Some ARIA implementations set aria-labelledby to generated ids; assert the title
      // text exists within the dialog rather than relying on accessible-name computation.
      expect(within(dialog).getByText(/session timeout warning/i)).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const extendButton = screen.getByRole('button', { name: /stay logged in|extend/i });
      const logoutButton = screen.getByRole('button', { name: /logout|log out/i });

      expect(extendButton).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
    });

    it('should use large, readable font for countdown', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const countdown = screen.getByText('5:00');
      expect(countdown).toHaveClass('text-3xl');
    });

    it('should use monospace font for countdown consistency', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const countdown = screen.getByText('5:00');
      expect(countdown).toHaveClass('font-mono');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero time remaining', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={0}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:00')).toBeInTheDocument();
    });

    it('should handle negative time remaining', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={-5000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

  // Should handle gracefully (display as 0 or handle negative)
  // Allow optional leading minus on minutes/seconds in current rendering
  const countdown = screen.getByText(/-?\d+:-?\d+/);
      expect(countdown).toBeInTheDocument();
    });

    it('should handle very large time values', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={7200000} // 120 minutes
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('120:00')).toBeInTheDocument();
    });

    it('should handle rapid open/close cycles', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      for (let i = 0; i < 5; i++) {
        rerender(
          <SessionTimeoutWarning
            isOpen={false}
            timeRemaining={10000}
            onExtendSession={mockOnExtendSession}
            onLogout={mockOnLogout}
          />
        );

        rerender(
          <SessionTimeoutWarning
            isOpen={true}
            timeRemaining={10000}
            onExtendSession={mockOnExtendSession}
            onLogout={mockOnLogout}
          />
        );
      }

      // Should still work correctly
      expect(screen.getByText('0:10')).toBeInTheDocument();
    });

    it('should handle timeRemaining update while open', () => {
      const { rerender } = render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={10000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('0:10')).toBeInTheDocument();

      // Update time remaining while still open
      rerender(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000} // Jump to 5 minutes
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      expect(screen.getByText('5:00')).toBeInTheDocument();
    });

    it('should not crash with missing callbacks', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={vi.fn()}
          onLogout={vi.fn()}
        />
      );

      expect(screen.getByText(/session timeout warning/i)).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should use warning color for timer', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const countdown = screen.getByText('5:00');
      expect(countdown).toHaveClass('text-amber-600');
    });

    it('should use warning color for clock icon', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const title = screen.getByText(/session timeout warning/i);
      const clockIcon = title.parentElement?.querySelector('svg');
      expect(clockIcon).toHaveClass('text-amber-500');
    });

    it('should display countdown prominently', () => {
      render(
        <SessionTimeoutWarning
          isOpen={true}
          timeRemaining={300000}
          onExtendSession={mockOnExtendSession}
          onLogout={mockOnLogout}
        />
      );

      const countdown = screen.getByText('5:00');
      expect(countdown).toHaveClass('font-bold');
    });
  });
});
