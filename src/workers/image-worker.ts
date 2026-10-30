/* 
  image-worker.ts — Web Worker for rendering PNG/JPG certificates via OffscreenCanvas
  Called from WorkerPoolManager via postMessage
*/

import type { WorkerTask, WorkerResult } from '@/types/worker';

// QR code generation inside worker (no DOM)
async function generateQRDataURL(text: string, size: number): Promise<string> {
  // We use a minimal QR approach in the worker context
  // Import qrcode dynamically
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(text, { width: size, margin: 1 });
}

self.onmessage = async (event: MessageEvent<WorkerTask>) => {
  const task = event.data;
  const startTime = performance.now();

  try {
    const { templateBytes, templateDimensions, dataRow, layoutElements, fieldMappings, outputFilename } = task;

    // Build resolved data from mappings
    const resolvedData: Record<string, string> = {};
    for (const mapping of fieldMappings) {
      const varKey = mapping.variableName.replace(/\{\{|\}\}/g, '');
      resolvedData[varKey] = dataRow[mapping.csvColumn] ?? '';
    }

    const { width, height } = templateDimensions;

    // Use OffscreenCanvas for GPU-accelerated rendering
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext('2d')!;

    // Draw template image
    const templateBlob = new Blob([templateBytes]);
    const imageBitmap = await createImageBitmap(templateBlob);
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    // Draw elements
    for (const el of layoutElements) {
      if (el.variableName === '{{qr_code}}') {
        const qrText = resolvedData['id_sertifikat'] || resolvedData['nama'] || 'CERT-ID';
        const qrDataUrl = await generateQRDataURL(qrText, Math.max(el.width, el.height));
        const resp = await fetch(qrDataUrl);
        const qrBlob = await resp.blob();
        const qrBitmap = await createImageBitmap(qrBlob);
        ctx.drawImage(qrBitmap, el.x, el.y, el.width, el.height);
        qrBitmap.close();
      } else {
        const rawKey = el.variableName.replace(/\{\{|\}\}/g, '');
        const text = resolvedData[rawKey] ?? '';
        if (!text) continue;

        const fontParts = [
          el.italic ? 'italic' : '',
          el.bold ? 'bold' : '',
          `${el.fontSize}px`,
          `"${el.fontFamily}", sans-serif`,
        ]
          .filter(Boolean)
          .join(' ');

        ctx.font = fontParts;
        ctx.fillStyle = el.fontColor || '#000000';
        ctx.textAlign = el.textAlign as CanvasTextAlign;
        ctx.textBaseline = 'top';
        ctx.fillText(text, el.x, el.y, el.width || undefined);
      }
    }

    const blob = await offscreen.convertToBlob({ type: 'image/png', quality: 1.0 });
    const renderTimeMs = performance.now() - startTime;

    const result: WorkerResult = {
      taskId: task.taskId,
      outputFilename,
      blob,
      renderTimeMs,
    };

    self.postMessage(result);
  } catch (error) {
    const result: WorkerResult = {
      taskId: task.taskId,
      outputFilename: task.outputFilename,
      blob: null,
      error: error instanceof Error ? error.message : String(error),
      renderTimeMs: performance.now() - startTime,
    };
    self.postMessage(result);
  }
};
