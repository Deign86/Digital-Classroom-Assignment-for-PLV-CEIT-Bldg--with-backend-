/**
 * Rate Limiter Service
 * 
 * Provides client-side rate limiting and throttling to prevent abuse
 * and reduce unnecessary server calls.
 */

type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
  message?: string;
};

type RateLimitRecord = {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Client-side rate limiter for preventing excessive API calls
 * 
 * @param key - Unique identifier for the rate limit (e.g., 'booking-create-userID')
 * @param config - Rate limit configuration
 * @returns true if allowed, false if rate limited
 */
export const checkRateLimit = (key: string, config: RateLimitConfig): { allowed: boolean; message?: string; retryAfter?: number } => {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Check if currently blocked
  if (record?.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      message: config.message || `Too many requests. Please wait ${retryAfter} seconds.`,
      retryAfter,
    };
  }

  // Reset if window has passed
  if (!record || now - record.firstAttempt > config.windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      firstAttempt: now,
    });
    return { allowed: true };
  }

  // Increment count
  record.count++;

  // Check if limit exceeded
  if (record.count > config.maxAttempts) {
    record.blockedUntil = now + config.windowMs;
    const retryAfter = Math.ceil(config.windowMs / 1000);
    return {
      allowed: false,
      message: config.message || `Too many requests. Please wait ${retryAfter} seconds.`,
      retryAfter,
    };
  }

  return { allowed: true };
};

/**
 * Reset rate limit for a specific key (useful after successful operations)
 */
export const resetRateLimit = (key: string): void => {
  rateLimitStore.delete(key);
};

/**
 * Clean up old rate limit records (call periodically)
 */
export const cleanupRateLimits = (): void => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstAttempt > maxAge) {
      rateLimitStore.delete(key);
    }
  }
};

/**
 * Debounce function to limit execution frequency
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, waitMs);
  };
};

/**
 * Throttle function to ensure minimum time between executions
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): ((...args: Parameters<T>) => void) => {
  let lastRun = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun >= limitMs) {
      func(...args);
      lastRun = now;
    } else {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        func(...args);
        lastRun = Date.now();
        timeoutId = null;
      }, limitMs - (now - lastRun));
    }
  };
};

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  BOOKING_CREATE: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many booking requests. Please wait a moment before trying again.',
  },
  BOOKING_UPDATE: {
    maxAttempts: 10,
    windowMs: 60 * 1000,
    message: 'Too many update requests. Please wait a moment.',
  },
  SCHEDULE_CREATE: {
    maxAttempts: 5,
    windowMs: 60 * 1000,
    message: 'Too many schedule requests. Please wait a moment before trying again.',
  },
  NOTIFICATION_ACK: {
    maxAttempts: 20,
    windowMs: 60 * 1000,
    message: 'Too many notification actions. Please slow down.',
  },
  PUSH_TOKEN_REGISTER: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many push token registration attempts. Please wait 5 minutes.',
  },
  SEARCH_QUERY: {
    maxAttempts: 30,
    windowMs: 60 * 1000,
    message: 'Too many search queries. Please wait a moment.',
  },
  PROFILE_UPDATE: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000,
    message: 'Too many profile updates. Please wait 5 minutes before trying again.',
  },
} as const;

// Cleanup old records every 30 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 30 * 60 * 1000);
}
