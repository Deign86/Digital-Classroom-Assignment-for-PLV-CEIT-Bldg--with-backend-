import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useBulkRunner from '../../../hooks/useBulkRunner';

describe('useBulkRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('batch execution', () => {
    it('should execute batch of tasks successfully', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3'),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(tasks[0]).toHaveBeenCalled();
      expect(tasks[1]).toHaveBeenCalled();
      expect(tasks[2]).toHaveBeenCalled();
    });

    it('should track progress during batch execution', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.processed).toBe(2);
      expect(result.current.total).toBe(2);
    });
  });

  describe('progress tracking', () => {
    it('should update processed count as tasks complete', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3'),
      ];

      act(() => {
        result.current.start(tasks);
      });

      await waitFor(() => {
        expect(result.current.processed).toBe(3);
      });
    });

    it('should call progress callback with correct values', async () => {
      const { result } = renderHook(() => useBulkRunner());
      const onProgress = vi.fn();

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      await act(async () => {
        await result.current.start(tasks, 2, onProgress);
      });

      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('partial failures', () => {
    it('should handle partial task failures', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockRejectedValue(new Error('Task failed')),
        vi.fn().mockResolvedValue('result3'),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.results[0].status).toBe('fulfilled');
      expect(result.current.results[1].status).toBe('rejected');
      expect(result.current.results[2].status).toBe('fulfilled');
    });

    it('should track failed tasks in results', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [vi.fn().mockRejectedValue(new Error('Failed'))];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.results[0].status).toBe('rejected');
      expect(result.current.results[0].reason).toBeInstanceOf(Error);
    });
  });

  describe('pause/resume', () => {
    it('should cancel running tasks', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('result'), 1000))),
        vi.fn().mockResolvedValue('result2'),
      ];

      act(() => {
        result.current.start(tasks);
      });

      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(result.current.running).toBe(false);
      });
    });

    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [vi.fn().mockResolvedValue('result')];

      await act(async () => {
        await result.current.start(tasks);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.processed).toBe(0);
      expect(result.current.total).toBe(0);
      expect(result.current.running).toBe(false);
    });
  });

  describe('completion', () => {
    it('should mark all tasks as completed', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.running).toBe(false);
      expect(result.current.processed).toBe(2);
    });

    it('should return results array with correct statuses', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
      ];

      const results = await act(async () => {
        return await result.current.start(tasks);
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
    });

    it('should handle empty task array', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const results = await act(async () => {
        return await result.current.start([]);
      });

      expect(results).toHaveLength(0);
      expect(result.current.running).toBe(false);
    });

    it('should respect concurrency limit', async () => {
      const { result } = renderHook(() => useBulkRunner());
      const taskPromises: Array<{ resolve: () => void }> = [];

      const tasks = Array.from({ length: 10 }, (_, i) =>
        vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              taskPromises[i] = { resolve };
            })
        )
      );

      act(() => {
        result.current.start(tasks, 2);
      });

      await waitFor(() => {
        // Only 2 tasks should be processing at once
        const processingCount = result.current.results.filter((r) => r.status === 'processing').length;
        expect(processingCount).toBeLessThanOrEqual(2);
      });

      // Resolve all tasks
      taskPromises.forEach((p) => p.resolve());
    });
  });

  describe('retry', () => {
    it('should reset state for retry', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [vi.fn().mockResolvedValue('result')];

      await act(async () => {
        await result.current.start(tasks);
      });

      act(() => {
        result.current.retry();
      });

      expect(result.current.processed).toBe(0);
      expect(result.current.running).toBe(false);
      expect(result.current.results).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle all tasks failing', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockRejectedValue(new Error('Task 1 failed')),
        vi.fn().mockRejectedValue(new Error('Task 2 failed')),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.results[0].status).toBe('rejected');
      expect(result.current.results[1].status).toBe('rejected');
    });

    it('should handle task that throws synchronously', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockImplementation(() => {
          throw new Error('Sync error');
        }),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.results[0].status).toBe('rejected');
    });
  });

  describe('state management', () => {
    it('should reset running state after completion', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [vi.fn().mockResolvedValue('result')];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.running).toBe(false);
    });

    it('should update total count correctly', async () => {
      const { result } = renderHook(() => useBulkRunner());

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3'),
      ];

      await act(async () => {
        await result.current.start(tasks);
      });

      expect(result.current.total).toBe(3);
      expect(result.current.processed).toBe(3);
    });
  });
});

