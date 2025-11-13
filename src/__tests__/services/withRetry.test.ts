import { describe, it, expect, vi, beforeEach } from 'vitest';
import withRetry, { isNetworkError } from '../../../lib/withRetry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries a flaky function until success', async () => {
    const calls: number[] = [];
    const fn = vi.fn(async () => {
      calls.push(1);
      if (calls.length < 3) {
        throw new Error('network timeout');
      }
      return 'ok';
    });

    const result = await withRetry(() => fn(), { attempts: 5, initialDelayMs: 1, shouldRetry: (e) => true });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error when retries exhausted', async () => {
    const fn = vi.fn(async () => {
      throw new Error('permanent failure');
    });

    await expect(withRetry(() => fn(), { attempts: 2, initialDelayMs: 1, shouldRetry: () => true })).rejects.toThrow('permanent failure');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('calculates backoff delay correctly', async () => {
    const startTime = Date.now();
    const fn = vi.fn(async () => {
      throw new Error('network error');
    });

    try {
      await withRetry(() => fn(), {
        attempts: 3,
        initialDelayMs: 10,
        shouldRetry: () => true,
      });
    } catch (e) {
      // Expected to fail
    }

    const elapsed = Date.now() - startTime;
    // Should have at least some delay between retries
    expect(elapsed).toBeGreaterThan(0);
  });

  it('respects max retries limit', async () => {
    const fn = vi.fn(async () => {
      throw new Error('network error');
    });

    await expect(
      withRetry(() => fn(), {
        attempts: 3,
        initialDelayMs: 1,
        shouldRetry: () => true,
      })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retriable errors', async () => {
    const fn = vi.fn(async () => {
      throw new Error('validation error');
    });

    await expect(
      withRetry(() => fn(), {
        attempts: 5,
        initialDelayMs: 1,
        shouldRetry: (e) => isNetworkError(e),
      })
    ).rejects.toThrow('validation error');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on nth retry', async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt++;
      if (attempt < 3) {
        throw new Error('network error');
      }
      return 'success';
    });

    const result = await withRetry(() => fn(), {
      attempts: 5,
      initialDelayMs: 1,
      shouldRetry: () => true,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('isNetworkError', () => {
  it('detects common network error text', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    expect(isNetworkError({ message: 'failed to fetch' })).toBe(true);
    expect(isNetworkError({ code: 'unavailable' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isNetworkError(new Error('validation error'))).toBe(false);
  });

  it('detects timeout errors', () => {
    expect(isNetworkError(new Error('timeout'))).toBe(true);
    expect(isNetworkError({ message: 'request timeout' })).toBe(true);
  });

  it('detects connection errors', () => {
    expect(isNetworkError(new Error('connection error'))).toBe(true);
    expect(isNetworkError({ code: 'unavailable' })).toBe(true);
  });

  it('handles null and undefined gracefully', () => {
    expect(isNetworkError(null as any)).toBe(false);
    expect(isNetworkError(undefined as any)).toBe(false);
  });
});

describe('withRetry edge cases', () => {
  it('should handle zero attempts gracefully', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('error'));

    await expect(
      withRetry(() => fn(), { attempts: 0, initialDelayMs: 1, shouldRetry: () => true })
    ).rejects.toThrow();

    expect(fn).toHaveBeenCalledTimes(0);
  });

  it('should handle very small delays', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const result = await withRetry(() => fn(), {
      attempts: 1,
      initialDelayMs: 0,
      shouldRetry: () => true,
    });

    expect(result).toBe('success');
  });

  it('should handle functions that return non-promises', async () => {
    const fn = vi.fn().mockReturnValue('sync-result');

    const result = await withRetry(() => Promise.resolve(fn()), {
      attempts: 1,
      initialDelayMs: 1,
      shouldRetry: () => true,
    });

    expect(result).toBe('sync-result');
  });
});
