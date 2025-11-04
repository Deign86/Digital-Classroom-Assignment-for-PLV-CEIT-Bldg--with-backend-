/**
 * Simple retry helper with exponential backoff for resilient API calls.
 * 
 * Retries failed operations with increasing delays between attempts,
 * helping to handle transient network errors and service unavailability.
 * 
 * @example
 * ```typescript
 * // Basic retry with defaults (3 attempts)
 * const data = await withRetry(() => fetch('/api/data'));
 * 
 * // Custom retry configuration
 * const result = await withRetry(
 *   () => someAsyncOperation(),
 *   { 
 *     attempts: 5,
 *     initialDelayMs: 500,
 *     shouldRetry: isNetworkError 
 *   }
 * );
 * ```
 */
export type WithRetryOptions = {
  /** Maximum number of attempts (default: 3) */
  attempts?: number;
  /** Initial delay in milliseconds before first retry (default: 300) */
  initialDelayMs?: number;
  /** Exponential backoff multiplier (default: 2) */
  factor?: number;
  /** Optional predicate to decide whether to retry on a given error */
  shouldRetry?: (err: unknown) => boolean;
};

const defaultOptions: Required<WithRetryOptions> = {
  attempts: 3,
  initialDelayMs: 300,
  factor: 2,
  shouldRetry: () => true,
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * Executes an async function with automatic retry logic and exponential backoff.
 * 
 * @template T - The return type of the function being retried
 * @param fn - The async function to execute with retry logic
 * @param opts - Optional configuration for retry behavior
 * @returns Promise resolving to the function's return value
 * @throws The last error encountered if all retry attempts fail
 * 
 * @example
 * ```typescript
 * // Retry a Firestore query with network error handling
 * const users = await withRetry(
 *   () => getDocs(usersCollection),
 *   { attempts: 3, shouldRetry: isNetworkError }
 * );
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, opts?: WithRetryOptions): Promise<T> {
  const options = { ...defaultOptions, ...(opts ?? {}) } as Required<WithRetryOptions>;
  let attempt = 0;
  let lastErr: unknown;

  while (attempt < options.attempts) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      attempt += 1;
      const willRetry = attempt < options.attempts && options.shouldRetry(err);
      if (!willRetry) break;
      const delay = Math.round(options.initialDelayMs * Math.pow(options.factor, attempt - 1));
      // small jitter to avoid thundering herd
      const jitter = Math.round(Math.random() * 100);
      await sleep(delay + jitter);
    }
  }

  // Final throw the last error
  throw lastErr;
}

/**
 * Predicate function to identify network-related errors that should be retried.
 * 
 * Checks for common network error indicators including:
 * - Network connectivity issues
 * - Fetch failures
 * - Timeouts
 * - Firebase unavailable/unknown errors
 * - Browser offline status
 * 
 * @param err - The error to check
 * @returns true if the error appears to be network-related and retryable
 * 
 * @example
 * ```typescript
 * await withRetry(
 *   () => fetchData(),
 *   { shouldRetry: isNetworkError }
 * );
 * ```
 */
export const isNetworkError = (err: unknown) => {
  try {
    if (!err) return false;
    const e = err as any;
    const msg = (e?.message ?? '').toString().toLowerCase();
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout') || msg.includes('timed out')) return true;
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !(navigator as any).onLine) return true;
    // Firebase Unavailable
    if (e?.code && typeof e.code === 'string' && (e.code === 'unavailable' || e.code === 'unknown')) return true;
    return false;
  } catch {
    return false;
  }
};

export default withRetry;
