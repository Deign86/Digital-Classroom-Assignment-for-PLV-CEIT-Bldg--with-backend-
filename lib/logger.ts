/**
 * Production-safe logging utility
 * Only logs in development mode, suppresses in production
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Sanitizes sensitive data before logging
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
 * Safe logging that only executes in development
 */
export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args.map(sanitize));
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args.map(sanitize));
  },
  
  warn: (...args: any[]) => {
    // Always show warnings
    console.warn(...args.map(sanitize));
  },
  
  error: (...args: any[]) => {
    // Always show errors
    console.error(...args.map(sanitize));
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args.map(sanitize));
  },
  
  /**
   * Force log even in production (use sparingly for critical errors)
   */
  force: (level: LogLevel, ...args: any[]) => {
    console[level](...args.map(sanitize));
  }
};

// Usage examples:
// logger.log('User logged in:', user);  // Only in dev
// logger.error('Critical error:', error);  // Always shown
// logger.debug('Token received:', token);  // Only in dev, token redacted
