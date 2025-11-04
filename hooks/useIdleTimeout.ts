import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Configuration options for the idle timeout hook
 */
interface IdleTimeoutOptions {
  /** Idle timeout duration in milliseconds */
  timeout: number;
  /** Callback fired when user becomes idle */
  onIdle: () => void;
  /** Optional callback fired when user becomes active again */
  onActive?: () => void;
  /** Optional callback fired when warning time is reached, receives remaining time */
  onWarning?: (timeRemaining: number) => void;
  /** Warning time in milliseconds before timeout (default: 5 minutes) */
  warningTime?: number;
  /** Whether the idle detection is disabled */
  disabled?: boolean;
}

/**
 * React hook for detecting user idle state and managing session timeouts.
 * 
 * Tracks user activity (mouse, keyboard, touch, scroll) and triggers callbacks
 * when the user becomes idle or when approaching the timeout threshold.
 * 
 * Features:
 * - Configurable timeout and warning periods
 * - Real-time countdown of remaining time
 * - Session extension capability
 * - Automatic cleanup on unmount
 * - Can be disabled/enabled dynamically
 * 
 * @param options - Configuration options for idle detection
 * @returns Object with idle state, time remaining, and session extension function
 * 
 * @example
 * ```typescript
 * const { isIdle, timeRemaining, extendSession } = useIdleTimeout({
 *   timeout: 15 * 60 * 1000, // 15 minutes
 *   warningTime: 2 * 60 * 1000, // 2 minutes warning
 *   onWarning: (remaining) => showWarning(remaining),
 *   onIdle: () => signOut(),
 *   onActive: () => hideWarning()
 * });
 * ```
 */
export const useIdleTimeout = ({
  timeout,
  onIdle,
  onActive,
  onWarning,
  warningTime = 5 * 60 * 1000, // 5 minutes before timeout
  disabled = false
}: IdleTimeoutOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeout);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    const startTime = Date.now();
    const endTime = startTime + timeout;

    countdownRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearTimeouts();
        setIsIdle(true);
        onIdle();
      }
    }, 1000);
  }, [timeout, onIdle, clearTimeouts]);

  const resetTimer = useCallback(() => {
    if (disabled) return;

    clearTimeouts();
    lastActivityRef.current = Date.now();
    setTimeRemaining(timeout);
    
    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    // Start countdown
    startCountdown();

    // Set warning timer
    const warningTimeout = timeout - warningTime;
    if (warningTimeout > 0) {
      warningRef.current = setTimeout(() => {
        onWarning?.(warningTime);
      }, warningTimeout);
    }

    // Set idle timer
    timeoutRef.current = setTimeout(() => {
      setIsIdle(true);
      onIdle();
    }, timeout);
  }, [disabled, timeout, warningTime, isIdle, onIdle, onActive, onWarning, clearTimeouts, startCountdown]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // Track user activity events
  useEffect(() => {
    if (disabled) {
      clearTimeouts();
      return;
    }

    const events = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle activity detection to avoid excessive resets
    let throttleTimeout: NodeJS.Timeout | null = null;
    
    const handleActivity = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
      }, 1000); // Throttle to once per second
      
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      clearTimeouts();
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [disabled, resetTimer, clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    isIdle,
    timeRemaining,
    extendSession,
    resetTimer
  };
};

export default useIdleTimeout;