import { useState, useCallback, useRef } from 'react';
import type { BatchConfig, GenerationProgress } from '@/types/certificate';
import { WorkerPoolManager } from '@/workers/worker-pool';
import { useIndexedDB } from './useIndexedDB';

export function useBatchProcessor() {
  const [progress, setProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    speed: 0,
    activeWorkers: 0,
    estimatedRemainingMs: 0,
    logs: [],
    status: 'idle',
  });

  const poolRef = useRef<WorkerPoolManager | null>(null);
  const { saveBatchHistory } = useIndexedDB();

  const startGeneration = useCallback(async (
    config: BatchConfig,
    templateBlob: Blob,
    templatePreviewUrl: string,
    templateName: string
  ) => {
    if (poolRef.current) {
      poolRef.current.cancel();
    }

    poolRef.current = new WorkerPoolManager();
    const startTime = Date.now();

    try {
      await poolRef.current.generateBatch(
        config,
        templateBlob,
        templatePreviewUrl,
        (p) => setProgress(p)
      );

      const executionTimeMs = Date.now() - startTime;
      await saveBatchHistory({
        templateName,
        totalGenerated: progress.completed,
        exportFormat: config.exportFormat,
        executionTimeMs,
        completedAt: Date.now(),
      });
    } catch (err) {
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        logs: [...prev.logs, `Error: ${err}`],
      }));
    }
  }, [saveBatchHistory, progress.completed]);

  const cancelGeneration = useCallback(() => {
    if (poolRef.current) {
      poolRef.current.cancel();
      setProgress((prev) => ({ ...prev, status: 'cancelled' }));
    }
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({
      total: 0, completed: 0, failed: 0, speed: 0,
      activeWorkers: 0, estimatedRemainingMs: 0, logs: [], status: 'idle',
    });
  }, []);

  return { progress, startGeneration, cancelGeneration, resetProgress };
}
