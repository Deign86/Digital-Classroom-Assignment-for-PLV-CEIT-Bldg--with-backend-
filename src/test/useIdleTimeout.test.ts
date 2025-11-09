import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdleTimeout } from '../../hooks/useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('initializes with idle state as false', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          onIdle: vi.fn(),
        })
      );

      expect(result.current.isIdle).toBe(false);
    });

    it('initializes with timeRemaining equal to timeout', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          onIdle: vi.fn(),
        })
      );

      expect(result.current.timeRemaining).toBe(10000);
    });

    it('provides extendSession function', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          onIdle: vi.fn(),
        })
      );

      expect(result.current.extendSession).toBeInstanceOf(Function);
    });

    it('provides resetTimer function', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          onIdle: vi.fn(),
        })
      );

      expect(result.current.resetTimer).toBeInstanceOf(Function);
    });
  });

  describe('Idle Detection', () => {
    it('calls onIdle callback after timeout period', async () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockOnIdle).toHaveBeenCalledTimes(1);
    });

    it('sets isIdle to true after timeout', async () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.isIdle).toBe(true);
    });

    it('counts down timeRemaining', async () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          onIdle: vi.fn(),
        })
      );

      // Initial state
      expect(result.current.timeRemaining).toBe(10000);

      // After 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.timeRemaining).toBeLessThanOrEqual(9000);

      // After 5 seconds total
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(result.current.timeRemaining).toBeLessThanOrEqual(5000);
    });

    it('sets timeRemaining to 0 when timeout is reached', async () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timeRemaining).toBe(0);
    });
  });

  describe('Warning Callback', () => {
    it('calls onWarning before timeout', async () => {
      const mockOnWarning = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          warningTime: 2000,
          onIdle: vi.fn(),
          onWarning: mockOnWarning,
        })
      );

      // Warning should trigger at (timeout - warningTime) = 8000ms
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(mockOnWarning).toHaveBeenCalledWith(2000);
    });

    it('does not call onWarning if not provided', async () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          warningTime: 2000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not crash
      expect(mockOnIdle).toHaveBeenCalled();
    });

    it('uses default warning time of 5 minutes', async () => {
      const mockOnWarning = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 30 * 60 * 1000, // 30 minutes
          onIdle: vi.fn(),
          onWarning: mockOnWarning,
        })
      );

      // Default warning at 25 minutes (30 - 5)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });

      expect(mockOnWarning).toHaveBeenCalledWith(5 * 60 * 1000);
    });

    it('does not set warning timer if warningTime is greater than timeout', async () => {
      const mockOnWarning = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          warningTime: 10000, // Greater than timeout
          onIdle: vi.fn(),
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Warning should never be called
      expect(mockOnWarning).not.toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('resets timer on mouse activity', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      // Advance halfway
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      // Simulate mouse activity
      act(() => {
        document.dispatchEvent(new Event('mousedown'));
        vi.advanceTimersByTime(1000); // Wait for throttle
      });

      // Should not trigger idle yet
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('resets timer on keyboard activity', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      act(() => {
        document.dispatchEvent(new Event('keypress'));
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('resets timer on scroll activity', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      act(() => {
        document.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('resets timer on touch activity', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      act(() => {
        document.dispatchEvent(new Event('touchstart'));
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('resets timer on click activity', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      act(() => {
        document.dispatchEvent(new Event('click'));
        vi.advanceTimersByTime(1000);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('throttles activity events to once per second', () => {
      const mockOnWarning = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 10000,
          warningTime: 2000,
          onIdle: vi.fn(),
          onWarning: mockOnWarning,
        })
      );

      // Rapid fire events
      act(() => {
        document.dispatchEvent(new Event('mousedown'));
        document.dispatchEvent(new Event('mousedown'));
        document.dispatchEvent(new Event('mousedown'));
        vi.advanceTimersByTime(500);
      });

      // Should only reset once due to throttling
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // Warning should trigger
      expect(mockOnWarning).toHaveBeenCalled();
    });

    it('calls onActive when returning from idle state', () => {
      const mockOnActive = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
          onActive: mockOnActive,
        })
      );

      // Go idle
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.isIdle).toBe(true);

      // Activity while idle
      act(() => {
        document.dispatchEvent(new Event('mousedown'));
        vi.advanceTimersByTime(1000);
      });

      expect(mockOnActive).toHaveBeenCalledTimes(1);
      expect(result.current.isIdle).toBe(false);
    });

    it('does not call onActive if not provided', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        document.dispatchEvent(new Event('mousedown'));
        vi.advanceTimersByTime(1000);
      });

      // Should not crash
      expect(result.current.isIdle).toBe(false);
    });
  });

  describe('Session Extension', () => {
    it('resets timer when extendSession is called', () => {
      const mockOnIdle = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      act(() => {
        result.current.extendSession();
      });

      // Should reset timeRemaining
      expect(result.current.timeRemaining).toBe(5000);

      // Should not trigger idle at original time
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('resets isIdle state when extending session', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      // Go idle
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.isIdle).toBe(true);

      // Extend session
      act(() => {
        result.current.extendSession();
      });

      expect(result.current.isIdle).toBe(false);
    });

    it('calls onActive when extending from idle state', () => {
      const mockOnActive = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
          onActive: mockOnActive,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      act(() => {
        result.current.extendSession();
      });

      expect(mockOnActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('does not set timers when disabled', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
          disabled: true,
        })
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('does not track activity when disabled', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
          disabled: true,
        })
      );

      act(() => {
        document.dispatchEvent(new Event('mousedown'));
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('ignores extendSession when disabled', () => {
      const mockOnIdle = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
          disabled: true,
        })
      );

      act(() => {
        result.current.extendSession();
        vi.advanceTimersByTime(10000);
      });

      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('clears timers when becoming disabled', () => {
      const mockOnIdle = vi.fn();
      
      const { rerender } = renderHook(
        ({ disabled }) =>
          useIdleTimeout({
            timeout: 5000,
            onIdle: mockOnIdle,
            disabled,
          }),
        { initialProps: { disabled: false } }
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Disable the hook
      rerender({ disabled: true });

      // Continue time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not trigger idle
      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('restarts timers when becoming enabled', () => {
      const mockOnIdle = vi.fn();
      
      const { rerender } = renderHook(
        ({ disabled }) =>
          useIdleTimeout({
            timeout: 5000,
            onIdle: mockOnIdle,
            disabled,
          }),
        { initialProps: { disabled: true } }
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Enable the hook
      rerender({ disabled: false });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should now trigger idle
      expect(mockOnIdle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keypress', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
    });

    it('clears all timeouts on unmount', () => {
      const mockOnIdle = vi.fn();
      
      const { unmount } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      unmount();

      // Continue time after unmount
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not trigger idle after unmount
      expect(mockOnIdle).not.toHaveBeenCalled();
    });

    it('clears throttle timeout on unmount', () => {
      const { unmount } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: vi.fn(),
        })
      );

      act(() => {
        document.dispatchEvent(new Event('mousedown'));
      });

      unmount();

      // Should not crash
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(2000);
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('handles very short timeout', () => {
      const mockOnIdle = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 100,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockOnIdle).toHaveBeenCalledTimes(1);
    });

    it('handles very long timeout', () => {
      const mockOnIdle = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 24 * 60 * 60 * 1000, // 24 hours
          onIdle: mockOnIdle,
        })
      );

      expect(result.current.timeRemaining).toBe(24 * 60 * 60 * 1000);
    });

    it('handles timeout equal to warning time', () => {
      const mockOnWarning = vi.fn();
      
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          warningTime: 5000,
          onIdle: vi.fn(),
          onWarning: mockOnWarning,
        })
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Warning should not be called (warningTimeout = 0)
      expect(mockOnWarning).not.toHaveBeenCalled();
    });

    it('handles multiple rapid extendSession calls', () => {
      const mockOnIdle = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        result.current.extendSession();
        result.current.extendSession();
        result.current.extendSession();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should trigger idle after last extend
      expect(mockOnIdle).toHaveBeenCalledTimes(1);
    });

    it('handles resetTimer called multiple times', () => {
      const mockOnIdle = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle: mockOnIdle,
        })
      );

      act(() => {
        result.current.resetTimer();
        result.current.resetTimer();
        result.current.resetTimer();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockOnIdle).toHaveBeenCalledTimes(1);
    });
  });
});
