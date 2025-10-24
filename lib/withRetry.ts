/**
 * Simple retry helper with exponential backoff.
 * Usage: await withRetry(() => fetch(...), { attempts: 3 })
 */
export type WithRetryOptions = {
  attempts?: number;
  initialDelayMs?: number;
  factor?: number;
  // Optional predicate to decide whether to retry on a given error
  shouldRetry?: (err: unknown) => boolean;
};

const defaultOptions: Required<WithRetryOptions> = {
  attempts: 3,
  initialDelayMs: 300,
  factor: 2,
  shouldRetry: () => true,
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

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

// Common predicate for network-like errors
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
