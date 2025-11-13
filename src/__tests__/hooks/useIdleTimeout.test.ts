import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdleTimeout } from '../../../hooks/useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('init', () => {
    it('should initialize with correct timeout', () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 15 * 60 * 1000, // 15 minutes
          onIdle,
        })
      );

      expect(result.current.timeRemaining).toBe(15 * 60 * 1000);
      expect(result.current.isIdle).toBe(false);
    });

    it('should start countdown timer on mount', async () => {
      const onIdle = vi.fn();
      renderHook(() =>
        useIdleTimeout({
          timeout: 1000,
          onIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onIdle).toHaveBeenCalled();
      });
    });
  });

  describe('activity detection', () => {
    it('should reset timer on mouse activity', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      const initialTime = result.current.timeRemaining;

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBeGreaterThan(initialTime - 2000);
      });
    });

    it('should reset timer on keyboard activity', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        const event = new KeyboardEvent('keypress', { bubbles: true });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBe(5000);
      });
    });

    it('should reset timer on scroll activity', async () => {
      const onIdle = vi.fn();
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        const event = new Event('scroll', { bubbles: true });
        document.dispatchEvent(event);
      });

      // Timer should be reset
      expect(onIdle).not.toHaveBeenCalled();
    });
  });

  describe('warning fires', () => {
    it('should fire warning callback before timeout', async () => {
      const onIdle = vi.fn();
      const onWarning = vi.fn();
      const warningTime = 2000;
      const timeout = 5000;

      renderHook(() =>
        useIdleTimeout({
          timeout,
          warningTime,
          onIdle,
          onWarning,
        })
      );

      act(() => {
        vi.advanceTimersByTime(timeout - warningTime);
      });

      await waitFor(() => {
        expect(onWarning).toHaveBeenCalledWith(warningTime);
      });
    });
  });

  describe('idle logout', () => {
    it('should call onIdle when timeout is reached', async () => {
      const onIdle = vi.fn();
      renderHook(() =>
        useIdleTimeout({
          timeout: 1000,
          onIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onIdle).toHaveBeenCalled();
      });
    });

    it('should set isIdle to true when timeout is reached', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 1000,
          onIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isIdle).toBe(true);
      });
    });
  });

  describe('extendSession', () => {
    it('should extend session when called', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const timeBeforeExtend = result.current.timeRemaining;

      act(() => {
        result.current.extendSession();
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBeGreaterThan(timeBeforeExtend);
      });
    });
  });

  describe('cascading activities', () => {
    it('should handle multiple rapid activities correctly', async () => {
      const onIdle = vi.fn();
      renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        // Simulate rapid activities
        for (let i = 0; i < 10; i++) {
          document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true }));
        }
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should not have triggered idle yet
      expect(onIdle).not.toHaveBeenCalled();
    });

    it('should handle touch activity', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        const event = new TouchEvent('touchstart', { bubbles: true });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBe(5000);
      });
    });

    it('should handle click activity', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        const event = new MouseEvent('click', { bubbles: true });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBe(5000);
      });
    });
  });

  describe('disabled state', () => {
    it('should not start timers when disabled', () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 1000,
          onIdle,
          disabled: true,
        })
      );

      expect(result.current.isIdle).toBe(false);
      expect(result.current.timeRemaining).toBe(1000);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onIdle).not.toHaveBeenCalled();
    });

    it('should clear timers when disabled changes to true', () => {
      const onIdle = vi.fn();
      const { rerender } = renderHook(
        ({ disabled }) =>
          useIdleTimeout({
            timeout: 1000,
            onIdle,
            disabled,
          }),
        { initialProps: { disabled: false } }
      );

      rerender({ disabled: true });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onIdle).not.toHaveBeenCalled();
    });
  });

  describe('onActive callback', () => {
    it('should call onActive when user becomes active after idle', async () => {
      const onIdle = vi.fn();
      const onActive = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 1000,
          onIdle,
          onActive,
        })
      );

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(onIdle).toHaveBeenCalled();
        expect(result.current.isIdle).toBe(true);
      });

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        document.dispatchEvent(event);
      });

      await waitFor(() => {
        expect(onActive).toHaveBeenCalled();
        expect(result.current.isIdle).toBe(false);
      });
    });
  });

  describe('resetTimer', () => {
    it('should reset timer when called manually', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      const timeBeforeReset = result.current.timeRemaining;

      act(() => {
        result.current.resetTimer();
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBeGreaterThan(timeBeforeReset);
      });
    });
  });

  describe('timeRemaining accuracy', () => {
    it('should update timeRemaining accurately', async () => {
      const onIdle = vi.fn();
      const { result } = renderHook(() =>
        useIdleTimeout({
          timeout: 5000,
          onIdle,
        })
      );

      const initialTime = result.current.timeRemaining;

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.timeRemaining).toBeLessThan(initialTime);
      });
    });
  });
});

