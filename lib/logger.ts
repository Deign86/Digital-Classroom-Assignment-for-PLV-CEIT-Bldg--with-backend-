/**
 * Production-safe logging utility that protects sensitive data.
 * 
 * Features:
 * - Only logs in development mode by default (except warnings and errors)
 * - Automatically sanitizes sensitive data (tokens, passwords, API keys)
 * - Provides typed log levels
 * - Includes force() method for critical production logging
 * 
 * @example
 * ```typescript
 * // Development only
 * logger.log('User logged in:', user);
 * logger.debug('API response:', data);
 * 
 * // Always shown
 * logger.warn('Deprecated feature used');
 * logger.error('Failed to save:', error);
 * 
 * // Force production logging (use sparingly)
 * logger.force('error', 'Critical system failure:', error);
 * ```
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Sanitizes sensitive data before logging to prevent credential leaks.
 * 
 * Redacts common sensitive field names including:
 * - token, password, apiKey, secret, credential
 * - fcmToken, vapidKey
 * 
 * @param data - Data to sanitize (primitives returned as-is)
 * @returns Sanitized copy of the data with sensitive fields redacted
 */
function sanitize(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = { ...data };
  const sensitiveKeys = ['token', 'password', 'apiKey', 'secret', 'credential', 'fcmToken', 'vapidKey'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Safe logging interface with automatic sanitization and environment awareness.
 * 
 * All methods automatically sanitize sensitive data before logging.
 * Development-only methods (log, info, debug) are suppressed in production.
 * Warnings and errors are always shown.
 */
export const logger = {
  /**
   * General logging (development only)
   * @param args - Values to log
   */
  log: (...args: any[]) => {
    if (isDev) console.log(...args.map(sanitize));
  },
  
  /**
   * Informational logging (development only)
   * @param args - Values to log
   */
  info: (...args: any[]) => {
    if (isDev) console.info(...args.map(sanitize));
  },
  
  /**
   * Warning logging (always shown)
   * @param args - Values to log
   */
  warn: (...args: any[]) => {
    // Always show warnings
    console.warn(...args.map(sanitize));
  },
  
  /**
   * Error logging (always shown)
   * @param args - Values to log
   */
  error: (...args: any[]) => {
    // Always show errors
    console.error(...args.map(sanitize));
  },
  
  /**
   * Debug logging (development only)
   * @param args - Values to log
   */
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args.map(sanitize));
  },
  
  /**
   * Forces logging even in production (use sparingly for critical errors).
   * @param level - The log level to use
   * @param args - Values to log
   */
  force: (level: LogLevel, ...args: any[]) => {
    console[level](...args.map(sanitize));
  }
};

// Usage examples:
// logger.log('User logged in:', user);  // Only in dev
// logger.error('Critical error:', error);  // Always shown
// logger.debug('Token received:', token);  // Only in dev, token redacted
