import { useCallback, useRef, useState } from 'react';

export type BulkTask<T = any> = () => Promise<T>;

export type BulkItemResult<T = any> = {
  status: 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'cancelled';
  value?: T;
  reason?: any;
};

export default function useBulkRunner() {
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BulkItemResult[]>([]);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setProcessed(0);
    setTotal(0);
    setResults([]);
    cancelledRef.current = false;
    setRunning(false);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const start = useCallback(async <T,>(tasks: BulkTask<T>[], concurrency = 4, onProgress?: (p: number, t: number) => void) => {
    if (!tasks || tasks.length === 0) return [] as BulkItemResult[];
    cancelledRef.current = false;
    setRunning(true);
    setTotal(tasks.length);
    setProcessed(0);

    const localResults: BulkItemResult[] = new Array(tasks.length).fill(null).map(() => ({ status: 'pending' }));
    setResults([...localResults]);

    let index = 0;
    let proc = 0;

    const workers: Promise<void>[] = new Array(Math.min(concurrency, tasks.length)).fill(Promise.resolve()).map(async () => {
      while (true) {
        const i = index++;
        if (i >= tasks.length) return;
        if (cancelledRef.current) {
          localResults[i] = { status: 'cancelled' };
          proc += 1;
          setProcessed(proc);
          setResults([...localResults]);
          onProgress?.(proc, tasks.length);
          continue;
        }

        // mark processing
        localResults[i] = { status: 'processing' };
        setResults([...localResults]);

        try {
          const value = await tasks[i]();
          localResults[i] = { status: 'fulfilled', value };
        } catch (err) {
          localResults[i] = { status: 'rejected', reason: err };
        } finally {
          proc += 1;
          setProcessed(proc);
          setResults([...localResults]);
          onProgress?.(proc, tasks.length);
        }
      }
    });

    await Promise.all(workers);
    setRunning(false);
    return localResults;
  }, []);

  const retry = useCallback(() => {
    // caller should construct a new start() with failed tasks
    // this helper simply resets internal flags so caller can call start again
    cancelledRef.current = false;
    setProcessed(0);
    setResults([]);
    setRunning(false);
  }, []);

  return {
    start,
    cancel,
    reset,
    retry,
    processed,
    total,
    results,
    running,
  } as const;
}
