// Rate limiting utilities for preventing abuse and spam
// Implements client-side rate limiting with localStorage and memory-based tracking

import { ErrorHandler, SecureError, ErrorType } from './errorHandling';

// Rate limiting configurations for different operations
export const RATE_LIMITS = {
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMinutes: 15,
    cooldownMinutes: 60,
  },
  LOGIN_ATTEMPTS: {
    maxAttempts: 5,
    windowMinutes: 15,
    cooldownMinutes: 30,
  },
  BOOKING_SUBMISSION: {
    maxAttempts: 10,
    windowMinutes: 5,
    cooldownMinutes: 2,
  },
  PROFILE_UPDATE: {
    maxAttempts: 5,
    windowMinutes: 10,
    cooldownMinutes: 5,
  },
  SIGNUP_REQUEST: {
    maxAttempts: 2,
    windowMinutes: 60,
    cooldownMinutes: 180,
  },
} as const;

// Rate limit entry structure
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

// In-memory rate limiting store (resets on page refresh)
const memoryStore = new Map<string, RateLimitEntry>();

// Rate limiting service
export class RateLimiter {
  private static getStorageKey(operation: string, identifier: string): string {
    return `rate_limit_${operation}_${identifier}`;
  }

  private static getEntry(operation: string, identifier: string): RateLimitEntry | null {
    const key = this.getStorageKey(operation, identifier);
    
    try {
      // Try localStorage first (persistent)
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      // Fallback to memory store if localStorage fails
      console.warn('localStorage not available, using memory store for rate limiting');
    }
    
    // Fallback to memory store
    return memoryStore.get(key) || null;
  }

  private static setEntry(operation: string, identifier: string, entry: RateLimitEntry): void {
    const key = this.getStorageKey(operation, identifier);
    
    try {
      // Try localStorage first
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // Fallback to memory store
      console.warn('localStorage not available, using memory store for rate limiting');
    }
    
    // Always update memory store as backup
    memoryStore.set(key, entry);
  }

  private static clearEntry(operation: string, identifier: string): void {
    const key = this.getStorageKey(operation, identifier);
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Ignore localStorage errors
    }
    
    memoryStore.delete(key);
  }

  /**
   * Check if an operation is rate limited
   * @param operation - The operation being performed
   * @param identifier - Unique identifier (email, user ID, etc.)
   * @param config - Rate limit configuration
   * @returns Rate limit check result
   */
  static checkRateLimit(
    operation: keyof typeof RATE_LIMITS,
    identifier: string,
    config = RATE_LIMITS[operation]
  ): {
    allowed: boolean;
    remainingAttempts: number;
    resetTime?: Date;
    message?: string;
  } {
    const now = Date.now();
    const windowMs = config.windowMinutes * 60 * 1000;
    const cooldownMs = config.cooldownMinutes * 60 * 1000;
    
    let entry = this.getEntry(operation, identifier);
    
    // Initialize or reset if outside window
    if (!entry || now - entry.firstAttempt > windowMs) {
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      };
    }

    // Check if still in cooldown period
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      const resetTime = new Date(entry.blockedUntil);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime,
        message: `Too many attempts. Try again after ${resetTime.toLocaleTimeString()}.`,
      };
    }

    // Reset block status if cooldown has expired
    if (entry.blocked && entry.blockedUntil && now >= entry.blockedUntil) {
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      };
    }

    const remainingAttempts = config.maxAttempts - entry.attempts;

    // Check if limit exceeded
    if (entry.attempts >= config.maxAttempts) {
      entry.blocked = true;
      entry.blockedUntil = now + cooldownMs;
      this.setEntry(operation, identifier, entry);
      
      const resetTime = new Date(entry.blockedUntil);
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime,
        message: `Rate limit exceeded. Try again after ${resetTime.toLocaleTimeString()}.`,
      };
    }

    return {
      allowed: true,
      remainingAttempts,
    };
  }

  /**
   * Record an attempt for rate limiting
   * @param operation - The operation being performed
   * @param identifier - Unique identifier
   * @param config - Rate limit configuration
   */
  static recordAttempt(
    operation: keyof typeof RATE_LIMITS,
    identifier: string,
    config = RATE_LIMITS[operation]
  ): void {
    const now = Date.now();
    let entry = this.getEntry(operation, identifier);
    
    if (!entry) {
      entry = {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        blocked: false,
      };
    } else {
      entry.attempts += 1;
      entry.lastAttempt = now;
    }

    this.setEntry(operation, identifier, entry);
  }

  /**
   * Reset rate limit for an operation and identifier
   * @param operation - The operation to reset
   * @param identifier - Unique identifier
   */
  static resetRateLimit(operation: keyof typeof RATE_LIMITS, identifier: string): void {
    this.clearEntry(operation, identifier);
  }

  /**
   * Get current rate limit status
   * @param operation - The operation to check
   * @param identifier - Unique identifier
   * @returns Current status
   */
  static getRateLimitStatus(
    operation: keyof typeof RATE_LIMITS,
    identifier: string
  ): {
    attempts: number;
    maxAttempts: number;
    blocked: boolean;
    resetTime?: Date;
  } {
    const config = RATE_LIMITS[operation];
    const entry = this.getEntry(operation, identifier);
    
    if (!entry) {
      return {
        attempts: 0,
        maxAttempts: config.maxAttempts,
        blocked: false,
      };
    }

    return {
      attempts: entry.attempts,
      maxAttempts: config.maxAttempts,
      blocked: entry.blocked,
      resetTime: entry.blockedUntil ? new Date(entry.blockedUntil) : undefined,
    };
  }

  /**
   * Enforce rate limiting with automatic error handling
   * @param operation - The operation being rate limited
   * @param identifier - Unique identifier
   * @param config - Optional custom configuration
   * @throws SecureError if rate limit exceeded
   */
  static enforceRateLimit(
    operation: keyof typeof RATE_LIMITS,
    identifier: string,
    config = RATE_LIMITS[operation]
  ): void {
    const check = this.checkRateLimit(operation, identifier, config);
    
    if (!check.allowed) {
      throw new SecureError(
        ErrorType.RATE_LIMIT,
        check.message || 'Too many requests. Please try again later.',
        undefined,
        429
      );
    }
  }

  /**
   * Clean up old rate limit entries (call periodically)
   */
  static cleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    try {
      // Clean localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rate_limit_')) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: RateLimitEntry = JSON.parse(stored);
            if (now - entry.lastAttempt > cleanupThreshold) {
              keysToRemove.push(key);
            }
          }
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Clean memory store
    for (const [key, entry] of memoryStore.entries()) {
      if (now - entry.lastAttempt > cleanupThreshold) {
        memoryStore.delete(key);
      }
    }
  }
}

// Rate limiting decorator for functions
export function rateLimit(operation: keyof typeof RATE_LIMITS, getIdentifier: (args: any[]) => string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const identifier = getIdentifier(args);
      
      // Enforce rate limit
      RateLimiter.enforceRateLimit(operation, identifier);
      
      // Record attempt
      RateLimiter.recordAttempt(operation, identifier);
      
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// React hook for rate limiting
export function useRateLimit(operation: keyof typeof RATE_LIMITS, identifier: string) {
  const checkLimit = () => RateLimiter.checkRateLimit(operation, identifier);
  const recordAttempt = () => RateLimiter.recordAttempt(operation, identifier);
  const resetLimit = () => RateLimiter.resetRateLimit(operation, identifier);
  const getStatus = () => RateLimiter.getRateLimitStatus(operation, identifier);

  return {
    checkLimit,
    recordAttempt,
    resetLimit,
    getStatus,
    enforceLimit: () => RateLimiter.enforceRateLimit(operation, identifier),
  };
}

// Initialize cleanup on module load
if (typeof window !== 'undefined') {
  // Clean up old entries every hour
  setInterval(() => {
    RateLimiter.cleanup();
  }, 60 * 60 * 1000);
  
  // Initial cleanup
  RateLimiter.cleanup();
}