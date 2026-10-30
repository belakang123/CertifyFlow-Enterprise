/*
  worker-pool.ts — Multi-threaded Worker Pool Manager
  Distributes certificate generation tasks across multiple Web Worker threads
  based on navigator.hardwareConcurrency
*/

import type { WorkerTask, WorkerResult } from '@/types/worker';
import type { BatchConfig, GenerationProgress } from '@/types/certificate';
import { getWorkerCount, sanitizeFilename, applyTemplateVariables } from '@/lib/utils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { mergePdfsToSingle } from '@/lib/pdf-builder';
import { v4 as uuidv4 } from 'uuid';

export type ProgressCallback = (progress: GenerationProgress) => void;

export class WorkerPoolManager {
  private workers: Worker[] = [];
  private workerCount: number;
  private cancelled = false;

  constructor() {
    this.workerCount = getWorkerCount();
  }

  cancel() {
    this.cancelled = true;
    this.terminateAll();
  }

  private terminateAll() {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
  }

  async generateBatch(
    config: BatchConfig,
    templateBlob: Blob,
    templatePreviewUrl: string,
    onProgress: ProgressCallback
  ): Promise<void> {
    this.cancelled = false;
    const startTime = Date.now();
    const totalTasks = config.data.length;

    const progress: GenerationProgress = {
      total: totalTasks,
      completed: 0,
      failed: 0,
      speed: 0,
      activeWorkers: this.workerCount,
      estimatedRemainingMs: 0,
      logs: [],
      status: 'running',
    };

    onProgress({ ...progress });

    const templateBytes = await templateBlob.arrayBuffer();

    // Determine worker script based on export format
    const isPdf = config.exportFormat === 'ZIP-PDF' || config.exportFormat === 'SINGLE-PDF';

    // Build task queue
    const tasks: WorkerTask[] = config.data.map((row, idx) => {
      const filename = sanitizeFilename(
        applyTemplateVariables(config.filenamePattern, row) || `sertifikat_${idx + 1}`
      );
      return {
        taskId: uuidv4(),
        workerIndex: idx % this.workerCount,
        templateBytes,
        templateFileType: isPdf ? 'application/pdf' : 'image/png',
        templateDimensions: { width: 1754, height: 1240 }, // A4 landscape 150dpi default
        dataRow: row,
        layoutElements: [], // Will be set from layoutConfig
        fieldMappings: config.fieldMappings,
        exportFormat: config.exportFormat,
        outputFilename: filename + (isPdf ? '.pdf' : '.png'),
        customFonts: [],
      };
    });

    const results: { filename: string; blob: Blob }[] = [];
    const completedAt: number[] = [];

    // Process with worker pool
    const workerPromises: Promise<void>[] = [];

    for (let i = 0; i < this.workerCount && i < totalTasks; i++) {
      const workerTasks = tasks.filter((t) => t.workerIndex === i);
      if (workerTasks.length === 0) continue;

      const promise = new Promise<void>((resolve) => {
        // Inline worker fallback using Blob URL for Next.js compatibility
        const worker = new Worker(
          new URL('../workers/image-worker.ts', import.meta.url),
          { type: 'module' }
        );
        this.workers.push(worker);

        let taskIndex = 0;

        const sendNext = () => {
          if (this.cancelled || taskIndex >= workerTasks.length) {
            worker.terminate();
            resolve();
            return;
          }
          worker.postMessage(workerTasks[taskIndex++]);
        };

        worker.onmessage = (e: MessageEvent<WorkerResult>) => {
          const result = e.data;
          completedAt.push(Date.now());

          if (result.blob) {
            results.push({ filename: result.outputFilename, blob: result.blob });
            progress.completed++;
            progress.logs.push(
              `[${new Date().toLocaleTimeString()}] [Worker ${i + 1}] ✓ ${result.outputFilename}`
            );
          } else {
            progress.failed++;
            progress.logs.push(
              `[${new Date().toLocaleTimeString()}] [Worker ${i + 1}] ✗ ${result.outputFilename}: ${result.error}`
            );
          }

          // Calculate speed
          const elapsed = (Date.now() - startTime) / 1000;
          progress.speed = elapsed > 0 ? Math.round(progress.completed / elapsed) : 0;
          const remaining = totalTasks - progress.completed - progress.failed;
          progress.estimatedRemainingMs = progress.speed > 0 ? (remaining / progress.speed) * 1000 : 0;

          if (progress.logs.length > 200) progress.logs = progress.logs.slice(-100);

          onProgress({ ...progress });
          sendNext();
        };

        worker.onerror = (err) => {
          progress.failed++;
          progress.logs.push(`[Worker ${i + 1}] Error: ${err.message}`);
          onProgress({ ...progress });
          sendNext();
        };

        sendNext();
      });

      workerPromises.push(promise);
    }

    await Promise.all(workerPromises);

    if (this.cancelled) {
      progress.status = 'cancelled';
      onProgress({ ...progress });
      return;
    }

    // Package results
    progress.logs.push(`[${new Date().toLocaleTimeString()}] Mengompresi ${results.length} file ke ZIP...`);
    onProgress({ ...progress });

    try {
      if (config.exportFormat === 'SINGLE-PDF') {
        // Merge all PDFs
        const pdfByteArrays = await Promise.all(
          results.map(async (r) => new Uint8Array(await r.blob.arrayBuffer()))
        );
        const merged = await mergePdfsToSingle(pdfByteArrays);
        saveAs(merged, `CertifyFlow_Batch_${Date.now()}.pdf`);
      } else {
        const zip = new JSZip();
        for (const { filename, blob } of results) {
          zip.file(filename, blob);
        }
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });
        saveAs(zipBlob, `CertifyFlow_Batch_${Date.now()}.zip`);
      }

      progress.status = 'done';
      progress.logs.push(`[${new Date().toLocaleTimeString()}] ✅ Download dimulai! Total: ${results.length} sertifikat`);
    } catch (err) {
      progress.status = 'error';
      progress.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Error packaging: ${err}`);
    }

    onProgress({ ...progress });
  }
}
