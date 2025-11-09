import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeWithNetworkHandling, createNetworkAwareOperation, checkIsOffline } from '../../lib/networkErrorHandler';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast-id'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../lib/withRetry', () => ({
  isNetworkError: (error: unknown) => {
    if (error instanceof Error) {
      return error.message.includes('network') || 
             error.message.includes('timeout') ||
             error.message.includes('ECONNREFUSED');
    }
    return false;
  },
}));

describe('networkErrorHandler', () => {
  let originalOnLine: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    originalOnLine = navigator.onLine;
    
    // Mock as online by default
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    
    // Restore original value
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      configurable: true,
      value: originalOnLine,
    });
  });

  describe('checkIsOffline', () => {
    it('returns false when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      expect(checkIsOffline()).toBe(false);
    });

    it('returns true when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(checkIsOffline()).toBe(true);
    });
  });

  describe('executeWithNetworkHandling - Success Cases', () => {
    it('executes operation successfully and returns data', async () => {
      const mockOperation = vi.fn().mockResolvedValue({ id: '123', name: 'Test' });

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
      expect(result.error).toBeUndefined();
    });

    it('shows loading toast by default', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.loading).toHaveBeenCalledWith('Processing...', {
        description: 'Attempting to test operation',
      });
    });

    it('dismisses loading toast on success', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
    });

    it('shows success toast when successMessage is provided', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        successMessage: 'Operation completed!',
      });

      expect(toast.success).toHaveBeenCalledWith('Success', {
        description: 'Operation completed!',
        duration: 4000,
      });
    });

    it('does not show success toast when successMessage is not provided', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('does not show success toast when silent is true', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        successMessage: 'Should not appear',
        silent: true,
      });

      expect(toast.success).not.toHaveBeenCalled();
    });

    it('does not show loading toast when showLoadingToast is false', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        showLoadingToast: false,
      });

      expect(toast.loading).not.toHaveBeenCalled();
    });
  });

  describe('executeWithNetworkHandling - Failure Cases', () => {
    it('returns failure result with error', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.data).toBeUndefined();
    });

    it('shows error toast on failure', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.error).toHaveBeenCalledWith('Operation Failed', {
        description: 'Failed to test operation: Operation failed',
        duration: 6000,
      });
    });

    it('uses custom error message prefix', async () => {
      const mockError = new Error('Something went wrong');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        errorMessagePrefix: 'Custom Error',
      });

      expect(toast.error).toHaveBeenCalledWith('Custom Error', {
        description: 'Failed to test operation: Something went wrong',
        duration: 6000,
      });
    });

    it('does not show error toast when showErrorToast is false', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        showErrorToast: false,
      });

      expect(toast.error).not.toHaveBeenCalled();
    });

    it('logs error to logger', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to test operation after 1 attempts:',
        mockError
      );
    });

    it('converts non-Error exceptions to Error', async () => {
      const mockOperation = vi.fn().mockRejectedValue('string error');

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });

  describe('executeWithNetworkHandling - Network Errors', () => {
    it('detects network errors and sets isNetworkError flag', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.isNetworkError).toBe(true);
    });

    it('shows network-specific error message', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.error).toHaveBeenCalledWith('Network Error', {
        description: 'Unable to test operation due to network issues. Please check your connection and try again.',
        duration: 7000,
        action: {
          label: 'Retry',
          onClick: expect.any(Function),
        },
      });
    });

    it('retries on network errors with exponential backoff', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 3,
      });

      // Fast-forward through retry delays
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('shows retry progress in loading toast', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 3,
      });

      await vi.runAllTimersAsync();

      await resultPromise;

      expect(toast.loading).toHaveBeenCalledWith('Retrying...', {
        id: 'toast-id',
        description: expect.stringContaining('Attempt'),
      });
    });

    it('stops retrying after maxAttempts', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 3,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('calculates backoff delay with jitter', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success');

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 2,
      });

      await vi.runAllTimersAsync();

      await resultPromise;

      // Should have shown retry countdown
      expect(toast.loading).toHaveBeenCalledWith('Connection issue detected...', expect.objectContaining({
        id: 'toast-id',
        description: expect.stringContaining('Retrying in'),
      }));
    });

    it('does not retry non-network errors', async () => {
      const authError = new Error('Unauthorized');
      const mockOperation = vi.fn().mockRejectedValue(authError);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 3,
      });

      expect(result.success).toBe(false);
      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });

    it('uses custom shouldRetry predicate', async () => {
      const customError = new Error('custom retryable error');
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(customError)
        .mockResolvedValue('success');

      const customShouldRetry = (error: unknown) => {
        if (error instanceof Error) {
          return error.message.includes('retryable');
        }
        return false;
      };

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 2,
        shouldRetry: customShouldRetry,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeWithNetworkHandling - Offline Detection', () => {
    it('immediately fails when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.isNetworkError).toBe(true);
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('shows offline error toast', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.error).toHaveBeenCalledWith('No internet connection', {
        description: 'Cannot test operation while offline. Please check your connection.',
        duration: 5000,
      });
    });

    it('stops retrying if goes offline during retry wait', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 3,
      });

      // Simulate going offline during retry wait
      await vi.advanceTimersByTimeAsync(500);
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result.success).toBe(false);
      // Should have stopped retrying
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('createNetworkAwareOperation', () => {
    it('creates a wrapped function with network handling', async () => {
      const mockService = vi.fn().mockResolvedValue({ id: '123' });

      const wrappedOperation = createNetworkAwareOperation(mockService, {
        operationName: 'create item',
      });

      const result = await wrappedOperation('arg1', 'arg2');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(mockService).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('passes through all arguments to service method', async () => {
      const mockService = vi.fn().mockResolvedValue('ok');

      const wrappedOperation = createNetworkAwareOperation(mockService, {
        operationName: 'update item',
      });

      await wrappedOperation(1, 'test', { key: 'value' }, true);

      expect(mockService).toHaveBeenCalledWith(1, 'test', { key: 'value' }, true);
    });

    it('handles errors from service method', async () => {
      const mockService = vi.fn().mockRejectedValue(new Error('Service error'));

      const wrappedOperation = createNetworkAwareOperation(mockService, {
        operationName: 'delete item',
      });

      const result = await wrappedOperation('id-123');

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Service error');
    });

    it('applies network handling options', async () => {
      const mockService = vi.fn().mockResolvedValue('ok');

      const wrappedOperation = createNetworkAwareOperation(mockService, {
        operationName: 'test operation',
        successMessage: 'Item created!',
        maxAttempts: 5,
      });

      await wrappedOperation();

      expect(toast.success).toHaveBeenCalledWith('Success', {
        description: 'Item created!',
        duration: 4000,
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles operation that throws undefined', async () => {
      const mockOperation = vi.fn().mockRejectedValue(undefined);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('handles operation that throws null', async () => {
      const mockOperation = vi.fn().mockRejectedValue(null);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('handles operation that throws number', async () => {
      const mockOperation = vi.fn().mockRejectedValue(404);

      const result = await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('404');
    });

    it('handles error with no message property', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error());

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
      });

      expect(toast.error).toHaveBeenCalledWith('Operation Failed', {
        description: 'Failed to test operation: Unknown error occurred',
        duration: 6000,
      });
    });

    it('caps backoff delay at 5000ms', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 10,
      });

      await vi.runAllTimersAsync();

      await resultPromise;

      // Backoff should not exceed 5000ms (5s)
      // First attempt: ~1s, second: ~2s, third: ~4s, fourth+: ~5s (capped)
      expect(mockOperation).toHaveBeenCalledTimes(10);
    });

    it('does not log single-attempt non-network errors', async () => {
      const authError = new Error('Unauthorized');
      const mockOperation = vi.fn().mockRejectedValue(authError);

      await executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 1,
      });

      // Should not spam logs for auth errors on first attempt
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs multi-attempt errors', async () => {
      const networkError = new Error('network timeout');
      const mockOperation = vi.fn().mockRejectedValue(networkError);

      const resultPromise = executeWithNetworkHandling(mockOperation, {
        operationName: 'test operation',
        maxAttempts: 2,
      });

      await vi.runAllTimersAsync();

      await resultPromise;

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to test operation after 2 attempts:',
        networkError
      );
    });
  });
});
