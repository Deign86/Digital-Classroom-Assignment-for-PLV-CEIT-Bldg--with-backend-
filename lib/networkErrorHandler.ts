/**
 * Network Error Handler - Provides comprehensive network failure detection and user feedback.
 * 
 * This module enhances the retry logic with proper UI/UX feedback, ensuring users
 * are informed about network issues rather than experiencing infinite loading states.
 */

import { toast } from 'sonner';
import { logger } from './logger';
import { isNetworkError } from './withRetry';

/**
 * Options for network-aware operation execution
 */
export interface NetworkAwareOptions {
  /** Operation name shown to the user (e.g., "submit booking request") */
  operationName: string;
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Whether to show a loading toast (default: true) */
  showLoadingToast?: boolean;
  /** Custom success message (optional) */
  successMessage?: string;
  /** Custom error message prefix (optional) */
  errorMessagePrefix?: string;
  /** Whether this is a silent operation (no toast on success, default: false) */
  silent?: boolean;
}

/**
 * Result of a network-aware operation
 */
export interface NetworkAwareResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error if failed */
  error?: Error;
  /** Whether failure was due to network issues */
  isNetworkError?: boolean;
}

/**
 * Tracks if the user is currently offline based on browser API
 */
let isOffline = false;
if (typeof navigator !== 'undefined') {
  isOffline = !navigator.onLine;
  
  window.addEventListener('online', () => {
    isOffline = false;
    toast.success('Connection restored', {
      description: 'You are back online',
      duration: 3000,
    });
  });
  
  window.addEventListener('offline', () => {
    isOffline = true;
    toast.error('No internet connection', {
      description: 'Please check your network connection',
      duration: 5000,
    });
  });
}

/**
 * Checks if the browser is currently offline
 */
export const checkIsOffline = (): boolean => {
  if (typeof navigator !== 'undefined') {
    return !navigator.onLine;
  }
  return false;
};

/**
 * Executes an async operation with network error handling and user feedback.
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Network error detection
 * - User-friendly toast notifications
 * - Loading state management
 * - Offline detection
 * 
 * @template T - The return type of the operation
 * @param operation - The async function to execute
 * @param options - Configuration options
 * @returns Result object with success status and data/error
 * 
 * @example
 * ```typescript
 * const result = await executeWithNetworkHandling(
 *   async () => await bookingRequestService.create(data),
 *   {
 *     operationName: 'submit booking request',
 *     successMessage: 'Booking request submitted successfully!',
 *     maxAttempts: 3
 *   }
 * );
 * 
 * if (result.success) {
 *   // Handle success
 * } else if (result.isNetworkError) {
 *   // Network-specific handling
 * }
 * ```
 */
export async function executeWithNetworkHandling<T>(
  operation: () => Promise<T>,
  options: NetworkAwareOptions
): Promise<NetworkAwareResult<T>> {
  const {
    operationName,
    maxAttempts = 3,
    showLoadingToast = true,
    successMessage,
    errorMessagePrefix,
    silent = false,
  } = options;

  // Check if offline before attempting
  if (checkIsOffline()) {
    toast.error('No internet connection', {
      description: `Cannot ${operationName} while offline. Please check your connection.`,
      duration: 5000,
    });
    
    return {
      success: false,
      error: new Error('No internet connection'),
      isNetworkError: true,
    };
  }

  let loadingToastId: string | number | undefined;
  
  if (showLoadingToast) {
    loadingToastId = toast.loading(`Processing...`, {
      description: `Attempting to ${operationName}`,
    });
  }

  let attempt = 0;
  let lastError: Error | null = null;

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (attempt < maxAttempts) {
    try {
      attempt++;
      
      // Update loading message on retry
      if (loadingToastId && attempt > 1) {
        toast.loading(`Retrying...`, {
          id: loadingToastId,
          description: `Attempt ${attempt} of ${maxAttempts}`,
        });
      }

      const result = await operation();

      // Success!
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }

      // Only show success toast if successMessage is explicitly provided
      if (!silent && successMessage !== undefined) {
        toast.success('Success', {
          description: successMessage,
          duration: 4000,
        });
      }

      return {
        success: true,
        data: result,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkIssue = isNetworkError(error) || checkIsOffline();

      logger.warn(`Attempt ${attempt}/${maxAttempts} failed for ${operationName}:`, lastError);

      // If it's not a network error or we're out of attempts, fail immediately
      if (!isNetworkIssue || attempt >= maxAttempts) {
        break;
      }

      // Network error - retry with backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      const jitter = Math.random() * 500;
      
      if (loadingToastId) {
        toast.loading(`Connection issue detected...`, {
          id: loadingToastId,
          description: `Retrying in ${Math.round((delay + jitter) / 1000)}s (Attempt ${attempt}/${maxAttempts})`,
        });
      }

      await sleep(delay + jitter);

      // Check if went offline during retry wait
      if (checkIsOffline()) {
        break;
      }
    }
  }

  // All attempts failed
  if (loadingToastId) {
    toast.dismiss(loadingToastId);
  }

  const wasNetworkError = isNetworkError(lastError) || checkIsOffline();

  if (wasNetworkError) {
    toast.error('Network Error', {
      description: `Unable to ${operationName} due to network issues. Please check your connection and try again.`,
      duration: 7000,
      action: {
        label: 'Retry',
        onClick: () => {
          // User can manually retry through UI
        },
      },
    });
  } else {
    const errorMessage = lastError?.message || 'Unknown error occurred';
    toast.error(errorMessagePrefix || 'Operation Failed', {
      description: `Failed to ${operationName}: ${errorMessage}`,
      duration: 6000,
    });
  }

  logger.error(`Failed to ${operationName} after ${attempt} attempts:`, lastError);

  return {
    success: false,
    error: lastError || new Error('Operation failed'),
    isNetworkError: wasNetworkError,
  };
}

/**
 * Creates a network-aware wrapper for a service method.
 * 
 * @param serviceMethod - The service method to wrap
 * @param options - Network handling options
 * @returns Wrapped function with network error handling
 * 
 * @example
 * ```typescript
 * const createBookingWithNetworkHandling = createNetworkAwareOperation(
 *   bookingRequestService.create,
 *   { operationName: 'submit booking request' }
 * );
 * 
 * const result = await createBookingWithNetworkHandling(bookingData);
 * ```
 */
export function createNetworkAwareOperation<TArgs extends any[], TResult>(
  serviceMethod: (...args: TArgs) => Promise<TResult>,
  options: Omit<NetworkAwareOptions, 'operationName'> & { operationName: string }
) {
  return async (...args: TArgs): Promise<NetworkAwareResult<TResult>> => {
    return executeWithNetworkHandling(
      () => serviceMethod(...args),
      options
    );
  };
}

/**
 * Hook-friendly version that returns a tuple with execute function and loading state
 * (for future React hook integration)
 */
export interface UseNetworkOperationOptions extends NetworkAwareOptions {
  /** Callback fired on success */
  onSuccess?: (data: any) => void;
  /** Callback fired on error */
  onError?: (error: Error, isNetworkError: boolean) => void;
}

export default {
  executeWithNetworkHandling,
  createNetworkAwareOperation,
  checkIsOffline,
};
