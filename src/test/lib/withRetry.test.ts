import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isNetworkError, type WithRetryOptions } from '../../../lib/withRetry'

describe('withRetry - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Basic Retry Functionality', () => {
    it('should return result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry failed operation with default attempts (3)', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw last error after all attempts exhausted', async () => {
      const error = new Error('All attempts failed')
      const fn = vi.fn().mockRejectedValue(error)
      
      const promise = withRetry(fn)
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('All attempts failed')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should succeed on last attempt', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success on last')
      
      const promise = withRetry(fn, { attempts: 3 })
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success on last')
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Custom Retry Attempts', () => {
    it('should respect custom attempts count', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'))
      
      const promise = withRetry(fn, { attempts: 5 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Failed')
      expect(fn).toHaveBeenCalledTimes(5)
    })

    it('should support single attempt (no retries)', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'))
      
      const promise = withRetry(fn, { attempts: 1 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Failed')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should support many retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'))
      
      const promise = withRetry(fn, { attempts: 10 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Failed')
      expect(fn).toHaveBeenCalledTimes(10)
    })
  })

  describe('Exponential Backoff', () => {
    it('should use exponential backoff with default settings', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn)
      
      // First call happens immediately
      expect(fn).toHaveBeenCalledTimes(1)
      
      // First retry after ~300ms (initialDelayMs: 300)
      await vi.advanceTimersByTimeAsync(400)
      expect(fn).toHaveBeenCalledTimes(2)
      
      // Second retry after ~600ms (300 * 2^1)
      await vi.advanceTimersByTimeAsync(700)
      expect(fn).toHaveBeenCalledTimes(3)
      
      const result = await promise
      expect(result).toBe('success')
    })

    it('should respect custom initialDelayMs', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { initialDelayMs: 1000 })
      
      expect(fn).toHaveBeenCalledTimes(1)
      
      await vi.advanceTimersByTimeAsync(1100)
      expect(fn).toHaveBeenCalledTimes(2)
      
      const result = await promise
      expect(result).toBe('success')
    })

    it('should respect custom exponential factor', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { 
        initialDelayMs: 100,
        factor: 3 
      })
      
      expect(fn).toHaveBeenCalledTimes(1)
      
      // First retry: 100ms
      await vi.advanceTimersByTimeAsync(200)
      expect(fn).toHaveBeenCalledTimes(2)
      
      // Second retry: 100 * 3^1 = 300ms
      await vi.advanceTimersByTimeAsync(400)
      expect(fn).toHaveBeenCalledTimes(3)
      
      const result = await promise
      expect(result).toBe('success')
    })

    it('should add jitter to backoff delays', async () => {
      const delays: number[] = []
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('success')
      
      const mockRandom = vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.8)
      
      const promise = withRetry(fn, { initialDelayMs: 100 })
      
      await vi.runAllTimersAsync()
      await promise
      
      expect(mockRandom).toHaveBeenCalled()
    })
  })

  describe('shouldRetry Predicate', () => {
    it('should stop retrying when shouldRetry returns false', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Non-retryable'))
      
      const promise = withRetry(fn, {
        attempts: 5,
        shouldRetry: () => false
      })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Non-retryable')
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('should continue retrying when shouldRetry returns true', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Retryable'))
      
      const promise = withRetry(fn, {
        attempts: 3,
        shouldRetry: () => true
      })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Retryable')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should pass error to shouldRetry predicate', async () => {
      const error1 = new Error('Network error')
      const error2 = new Error('Auth error')
      const fn = vi.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
      
      const shouldRetry = vi.fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
      
      const promise = withRetry(fn, { shouldRetry })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Auth error')
      expect(shouldRetry).toHaveBeenCalledWith(error1)
      expect(shouldRetry).toHaveBeenCalledWith(error2)
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should use isNetworkError for network failures', async () => {
      const networkError = new Error('Network request failed')
      const fn = vi.fn().mockRejectedValue(networkError)
      
      const promise = withRetry(fn, {
        attempts: 3,
        shouldRetry: isNetworkError
      })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Network request failed')
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe('isNetworkError', () => {
    it('should return true for network error messages', () => {
      expect(isNetworkError(new Error('network error'))).toBe(true)
      expect(isNetworkError(new Error('Network request failed'))).toBe(true)
      expect(isNetworkError(new Error('NETWORK_UNAVAILABLE'))).toBe(true)
    })

    it('should return true for fetch failures', () => {
      expect(isNetworkError(new Error('failed to fetch'))).toBe(true)
      expect(isNetworkError(new Error('Failed to fetch resource'))).toBe(true)
    })

    it('should return true for timeout errors', () => {
      expect(isNetworkError(new Error('timeout occurred'))).toBe(true)
      expect(isNetworkError(new Error('request timed out'))).toBe(true)
      expect(isNetworkError(new Error('Timed out waiting'))).toBe(true)
    })

    it('should return true for Firebase unavailable errors', () => {
      expect(isNetworkError({ code: 'unavailable', message: 'Service unavailable' })).toBe(true)
      expect(isNetworkError({ code: 'unknown', message: 'Unknown error' })).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError(new Error('permission-denied'))).toBe(false)
      expect(isNetworkError(new Error('not-found'))).toBe(false)
      expect(isNetworkError(new Error('invalid-argument'))).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError(undefined)).toBe(false)
    })

    it('should handle case-insensitive matching', () => {
      expect(isNetworkError(new Error('NETWORK ERROR'))).toBe(true)
      expect(isNetworkError(new Error('Failed To Fetch'))).toBe(true)
      expect(isNetworkError(new Error('TIMEOUT'))).toBe(true)
    })

    it('should handle errors without message property', () => {
      expect(isNetworkError({ code: 'unavailable' })).toBe(true)
      expect(isNetworkError({ someProperty: 'value' })).toBe(false)
    })

    it('should not throw when checking malformed errors', () => {
      expect(() => isNetworkError('string error')).not.toThrow()
      expect(() => isNetworkError(123)).not.toThrow()
      expect(() => isNetworkError({})).not.toThrow()
    })
  })

  describe('Return Value Types', () => {
    it('should preserve string return type', async () => {
      const fn = vi.fn().mockResolvedValue('hello')
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('hello')
      expect(typeof result).toBe('string')
    })

    it('should preserve number return type', async () => {
      const fn = vi.fn().mockResolvedValue(42)
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe(42)
      expect(typeof result).toBe('number')
    })

    it('should preserve object return type', async () => {
      const data = { id: 1, name: 'Test' }
      const fn = vi.fn().mockResolvedValue(data)
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toEqual(data)
      expect(result).toHaveProperty('id', 1)
      expect(result).toHaveProperty('name', 'Test')
    })

    it('should preserve array return type', async () => {
      const fn = vi.fn().mockResolvedValue([1, 2, 3])
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toEqual([1, 2, 3])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle null return value', async () => {
      const fn = vi.fn().mockResolvedValue(null)
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBeNull()
    })

    it('should handle undefined return value', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)
      
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle synchronous errors in async function', async () => {
      const fn = vi.fn(() => {
        throw new Error('Synchronous error')
      })
      
      const promise = withRetry(fn as any)
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Synchronous error')
    })

    it('should handle empty options object', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const promise = withRetry(fn, {})
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
    })

    it('should handle partial options', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { attempts: 5 })
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
    })

    it('should handle zero attempts gracefully', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const promise = withRetry(fn, { attempts: 0 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      // With 0 attempts, function never runs, throws undefined
      await expect(promise).rejects.toBeUndefined()
      expect(fn).not.toHaveBeenCalled()
    })

    it('should handle negative attempts', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const promise = withRetry(fn, { attempts: -1 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toBeUndefined()
      expect(fn).not.toHaveBeenCalled()
    })

    it('should handle very large attempt counts', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { attempts: 1000 })
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2) // Succeeds on second try
    })

    it('should handle zero initial delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { initialDelayMs: 0 })
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
    })

    it('should handle very large initial delay', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { initialDelayMs: 10000 })
      
      await vi.advanceTimersByTimeAsync(11000)
      const result = await promise
      
      expect(result).toBe('success')
    })

    it('should handle factor of 1 (no exponential growth)', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('1'))
        .mockRejectedValueOnce(new Error('2'))
        .mockResolvedValue('success')
      
      const promise = withRetry(fn, { 
        initialDelayMs: 100,
        factor: 1 
      })
      
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('success')
    })
  })

  describe('Error Preservation', () => {
    it('should preserve error type', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message)
          this.name = 'CustomError'
        }
      }
      
      const error = new CustomError('Custom error occurred')
      const fn = vi.fn().mockRejectedValue(error)
      
      const promise = withRetry(fn)
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow(CustomError)
      await expect(promise).rejects.toThrow('Custom error occurred')
    })

    it('should preserve error properties', async () => {
      const error = new Error('Test error')
      ;(error as any).statusCode = 500
      ;(error as any).details = { foo: 'bar' }
      
      const fn = vi.fn().mockRejectedValue(error)
      
      const promise = withRetry(fn)
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      try {
        await promise
      } catch (e: any) {
        expect(e.statusCode).toBe(500)
        expect(e.details).toEqual({ foo: 'bar' })
      }
    })

    it('should throw last error, not first error', async () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error')
      const error3 = new Error('Third error')
      
      const fn = vi.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(error3)
      
      const promise = withRetry(fn, { attempts: 3 })
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Third error')
      await expect(promise).rejects.not.toThrow('First error')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle typical API call pattern', async () => {
      const apiCall = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue({ data: 'success' })
      
      const promise = withRetry(
        () => apiCall(),
        { 
          attempts: 3,
          initialDelayMs: 100,
          shouldRetry: isNetworkError 
        }
      )
      
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toEqual({ data: 'success' })
      expect(apiCall).toHaveBeenCalledTimes(2)
    })

    it('should handle Firestore query pattern', async () => {
      const firestoreQuery = vi.fn()
        .mockRejectedValueOnce({ code: 'unavailable', message: 'Firestore unavailable' })
        .mockResolvedValue({ docs: [] })
      
      const promise = withRetry(
        () => firestoreQuery(),
        { shouldRetry: isNetworkError }
      )
      
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toEqual({ docs: [] })
      expect(firestoreQuery).toHaveBeenCalledTimes(2)
    })

    it('should not retry authentication errors', async () => {
      const authCall = vi.fn()
        .mockRejectedValue(new Error('permission-denied'))
      
      const promise = withRetry(
        () => authCall(),
        { 
          attempts: 3,
          shouldRetry: isNetworkError 
        }
      )
      // Catch promise to prevent unhandled rejection
      promise.catch(() => {})
      
      await vi.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('permission-denied')
      expect(authCall).toHaveBeenCalledTimes(1) // No retries for auth errors
    })
  })

  describe('Performance', () => {
    it('should complete quickly on immediate success', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      
      const startTime = Date.now()
      const promise = withRetry(fn)
      await vi.runAllTimersAsync()
      await promise
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle many rapid retries efficiently', async () => {
      const fn = vi.fn()
      
      for (let i = 0; i < 99; i++) {
        fn.mockRejectedValueOnce(new Error(`Attempt ${i}`))
      }
      fn.mockResolvedValue('finally success')
      
      const promise = withRetry(fn, { 
        attempts: 100,
        initialDelayMs: 1 
      })
      
      await vi.runAllTimersAsync()
      const result = await promise
      
      expect(result).toBe('finally success')
      expect(fn).toHaveBeenCalledTimes(100)
    })
  })
})
