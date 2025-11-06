import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logClientError, type ClientErrorRecord } from '../../../lib/errorLogger';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _seconds: 1234567890, _nanoseconds: 0 })),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: vi.fn(),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  getFirebaseDb: vi.fn(() => ({ type: 'MockedFirestore' })),
  getFirebaseApp: vi.fn(() => ({ options: { projectId: 'test-project' } })),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// Import mocked modules
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logger } from '../../../lib/logger';

describe('errorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logClientError', () => {
    it('should log error via Cloud Function successfully', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'error-log-123', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Test error',
        stack: 'Error: Test error\\n    at Function.test',
        url: 'https://example.com/page',
        userAgent: 'Mozilla/5.0',
        userId: 'user123',
      };

      const id = await logClientError(payload);

      expect(id).toBe('error-log-123');
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'logClientError');
      expect(mockCallable).toHaveBeenCalledWith(payload);
    });

    it('should fallback to Firestore when Cloud Function fails', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Function not found'));
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'fallback-123' } as any);

      const payload = {
        message: 'Fallback error',
        stack: 'Error stack',
      };

      const id = await logClientError(payload);

      expect(id).toBe('fallback-123');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('falling back'),
        expect.any(Error)
      );
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        ...payload,
        createdAt: expect.anything(),
      });
    });

    it('should return null when both Cloud Function and Firestore fail', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Function failed'));
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockRejectedValue(new Error('Firestore write failed'));

      const payload = {
        message: 'Error that fails to log',
      };

      const id = await logClientError(payload);

      expect(id).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write client error log'),
        expect.any(Error)
      );
    });

    it('should handle minimal error payload', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'minimal-error' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Minimal error',
      };

      const id = await logClientError(payload);

      expect(id).toBe('minimal-error');
      expect(mockCallable).toHaveBeenCalledWith(payload);
    });

    it('should handle error payload with all fields', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'complete-error' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload: Omit<ClientErrorRecord, 'createdAt'> = {
        message: 'Complete error',
        stack: 'Full stack trace here',
        info: { component: 'LoginForm', action: 'submit' },
        url: 'https://example.com/login',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        userId: 'user456',
      };

      const id = await logClientError(payload);

      expect(id).toBe('complete-error');
      expect(mockCallable).toHaveBeenCalledWith(payload);
    });

    it('should handle null userId', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'null-user' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error with null user',
        userId: null,
      };

      const id = await logClientError(payload);

      expect(id).toBe('null-user');
      expect(mockCallable).toHaveBeenCalledWith(payload);
    });

    it('should handle undefined optional fields', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'undefined-fields' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error with undefined fields',
        stack: undefined,
        info: undefined,
        url: undefined,
        userAgent: undefined,
        userId: undefined,
      };

      const id = await logClientError(payload);

      expect(id).toBe('undefined-fields');
    });

    it('should handle very long error messages', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'long-message' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const longMessage = 'A'.repeat(10000);
      const payload = {
        message: longMessage,
      };

      const id = await logClientError(payload);

      expect(id).toBe('long-message');
      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        message: longMessage,
      }));
    });

    it('should handle very long stack traces', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'long-stack' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const longStack = 'Error: Test\\n' + '    at Function.test\\n'.repeat(1000);
      const payload = {
        message: 'Error with long stack',
        stack: longStack,
      };

      const id = await logClientError(payload);

      expect(id).toBe('long-stack');
    });

    it('should handle complex info objects', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'complex-info' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error with complex info',
        info: {
          nested: {
            deeply: {
              buried: 'value',
            },
          },
          array: [1, 2, 3],
          nullValue: null,
          undefinedValue: undefined,
        },
      };

      const id = await logClientError(payload);

      expect(id).toBe('complex-info');
      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        info: expect.objectContaining({
          nested: expect.any(Object),
          array: expect.any(Array),
        }),
      }));
    });

    it('should handle empty error message', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'empty-message' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: '',
      };

      const id = await logClientError(payload);

      expect(id).toBe('empty-message');
    });

    it('should handle special characters in error message', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'special-chars' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error with <script>alert("xss")</script> & emoji 🚨',
      };

      const id = await logClientError(payload);

      expect(id).toBe('special-chars');
      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error with <script>alert("xss")</script> & emoji 🚨',
      }));
    });

    it('should include serverTimestamp in Firestore fallback', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Function failed'));
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const mockTimestamp = { _seconds: 1234567890, _nanoseconds: 0 };
      vi.mocked(serverTimestamp).mockReturnValue(mockTimestamp as any);
      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'with-timestamp' } as any);

      const payload = {
        message: 'Error with timestamp',
      };

      const id = await logClientError(payload);

      expect(id).toBe('with-timestamp');
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        message: 'Error with timestamp',
        createdAt: mockTimestamp,
      });
      expect(serverTimestamp).toHaveBeenCalled();
    });

    it('should handle Cloud Function returning no id', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true }, // No id field
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'fallback-no-id' } as any);

      const payload = {
        message: 'Error with no id from function',
      };

      const id = await logClientError(payload);

      // Should fallback to Firestore when function doesn't return id
      expect(id).toBe('fallback-no-id');
      expect(addDoc).toHaveBeenCalled();
    });

    it('should handle Cloud Function returning empty data', async () => {
      const mockCallable = vi.fn().mockResolvedValue({});
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'fallback-empty-data' } as any);

      const payload = {
        message: 'Error with empty function response',
      };

      const id = await logClientError(payload);

      expect(id).toBe('fallback-empty-data');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent error logging', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'concurrent-error', success: true },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const errors = Array.from({ length: 10 }, (_, i) => ({
        message: `Error ${i}`,
        userId: `user${i}`,
      }));

      const promises = errors.map((payload) => logClientError(payload));
      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(10);
      expect(ids.every((id) => id === 'concurrent-error')).toBe(true);
      expect(mockCallable).toHaveBeenCalledTimes(10);
    });

    it('should handle errors with circular references in info', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'circular-ref' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      // Create circular reference
      const info: any = { a: 1 };
      info.self = info;

      const payload = {
        message: 'Error with circular reference',
        info,
      };

      // Should not throw, even with circular references
      const id = await logClientError(payload);

      expect(id).toBe('circular-ref');
    });

    it('should handle null payload fields gracefully', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'null-fields' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error',
        stack: null, // stack allows null
        info: null, // info is any, allows null
        url: undefined, // url only allows string | undefined
        userAgent: undefined, // userAgent only allows string | undefined
        userId: null, // userId allows null
      };

      const id = await logClientError(payload);

      expect(id).toBe('null-fields');
    });

    it('should handle Firestore addDoc returning null', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Function failed'));
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue(null as any);

      const payload = {
        message: 'Error with null addDoc result',
      };

      const id = await logClientError(payload);

      // Should handle null gracefully
      expect(id).toBeNull();
    });

    it('should handle URLs with special characters', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'special-url' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: 'Error',
        url: 'https://example.com/page?param=value&foo=bar#hash',
      };

      const id = await logClientError(payload);

      expect(id).toBe('special-url');
      expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://example.com/page?param=value&foo=bar#hash',
      }));
    });

    it('should handle very long URLs', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'long-url' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const longUrl = 'https://example.com/' + 'path/'.repeat(1000);
      const payload = {
        message: 'Error',
        url: longUrl,
      };

      const id = await logClientError(payload);

      expect(id).toBe('long-url');
    });

    it('should handle malformed Error objects', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'malformed-error' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const payload = {
        message: undefined as any, // Malformed
        stack: 123 as any, // Wrong type
      };

      const id = await logClientError(payload);

      expect(id).toBe('malformed-error');
    });
  });

  describe('Performance', () => {
    it('should handle rapid error logging', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'rapid-error' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const promises = Array.from({ length: 50 }, (_, i) => 
        logClientError({ message: `Rapid error ${i}` })
      );

      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(50);
      expect(ids.every((id) => id === 'rapid-error')).toBe(true);
      expect(mockCallable).toHaveBeenCalledTimes(50);
    });

    it('should handle mixed success and failure scenarios', async () => {
      let callCount = 0;
      const mockCallable = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve({ data: { id: `success-${callCount}` } });
        }
        return Promise.reject(new Error('Simulated failure'));
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockResolvedValue({ id: 'fallback' } as any);

      const promises = Array.from({ length: 10 }, (_, i) => 
        logClientError({ message: `Mixed error ${i}` })
      );

      const ids = await Promise.all(promises);

      expect(ids).toHaveLength(10);
      // Half should succeed with function, half should fallback
      expect(ids.filter((id) => id?.startsWith('success-'))).toHaveLength(5);
      expect(ids.filter((id) => id === 'fallback')).toHaveLength(5);
    });
  });

  describe('Integration', () => {
    it('should work as part of error handling workflow', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { id: 'workflow-error' },
      });
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      // Simulate catching an error
      try {
        throw new Error('Something went wrong');
      } catch (error: any) {
        const id = await logClientError({
          message: error.message,
          stack: error.stack,
          url: 'https://example.com/test',
          userId: 'test-user',
        });

        expect(id).toBe('workflow-error');
        expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Something went wrong',
          stack: expect.any(String),
        }));
      }
    });

    it('should not throw when logging fails', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Function failed'));
      vi.mocked(getFunctions).mockReturnValue({} as any);
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(addDoc).mockRejectedValue(new Error('Firestore failed'));

      // Should not throw even when both fail
      const id = await logClientError({ message: 'Critical error' });

      expect(id).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
