import { useEffect, useRef, useCallback, useState } from 'react';

interface IdleTimeoutOptions {
  timeout: number; // in milliseconds
  onIdle: () => void;
  onActive?: () => void;
  onWarning?: (timeRemaining: number) => void;
  warningTime?: number; // warning time in milliseconds before timeout
  disabled?: boolean;
}

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