import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { LayoutElement, FieldMapping } from '@/types/certificate';
import { applyTemplateVariables } from './utils';
import { generateQRCodeDataURL } from './qrcode';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

export async function renderPdfCertificate(
  templateBytes: ArrayBuffer,
  dataRow: Record<string, string>,
  elements: LayoutElement[],
  fieldMappings: FieldMapping[],
  customFonts: { fontName: string; fontData: ArrayBuffer }[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const page = pages[0];
  const { height: pageHeight } = page.getSize();

  // Build resolved data from field mappings
  const resolvedData: Record<string, string> = {};
  for (const mapping of fieldMappings) {
    const varKey = mapping.variableName.replace(/\{\{|\}\}/g, '');
    resolvedData[varKey] = dataRow[mapping.csvColumn] ?? '';
  }

  // Load custom fonts
  const loadedFonts: Record<string, Awaited<ReturnType<typeof pdfDoc.embedFont>>> = {};
  for (const cf of customFonts) {
    try {
      const font = await pdfDoc.embedFont(cf.fontData);
      loadedFonts[cf.fontName] = font;
    } catch {
      // fallback silently
    }
  }

  const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const el of elements) {
    if (el.variableName === '{{qr_code}}') {
      const qrText = resolvedData['id_sertifikat'] || resolvedData['nama'] || 'CERT';
      const qrDataUrl = await generateQRCodeDataURL(qrText, 200);
      const base64 = qrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, {
        x: el.x,
        y: pageHeight - el.y - el.height,
        width: el.width,
        height: el.height,
      });
    } else {
      const rawText = el.variableName.replace(/\{\{|\}\}/g, '');
      const text = resolvedData[rawText] ?? '';
      if (!text) continue;

      const font = loadedFonts[el.fontFamily] || defaultFont;
      const color = hexToRgb(el.fontColor || '#000000');

      page.drawText(text, {
        x: el.x,
        y: pageHeight - el.y - el.fontSize,
        size: el.fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        maxWidth: el.width,
      });
    }
  }

  return await pdfDoc.save();
}

export async function renderImageCertificate(
  templateDataUrl: string,
  templateWidth: number,
  templateHeight: number,
  dataRow: Record<string, string>,
  elements: LayoutElement[],
  fieldMappings: FieldMapping[]
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = templateWidth;
  canvas.height = templateHeight;
  const ctx = canvas.getContext('2d')!;

  // Draw template background
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = templateDataUrl;
  });
  ctx.drawImage(img, 0, 0, templateWidth, templateHeight);

  // Build resolved data
  const resolvedData: Record<string, string> = {};
  for (const mapping of fieldMappings) {
    const varKey = mapping.variableName.replace(/\{\{|\}\}/g, '');
    resolvedData[varKey] = dataRow[mapping.csvColumn] ?? '';
  }

  // Draw elements
  for (const el of elements) {
    if (el.variableName === '{{qr_code}}') {
      const qrText = resolvedData['id_sertifikat'] || resolvedData['nama'] || 'CERT';
      const qrDataUrl = await generateQRCodeDataURL(qrText, Math.max(el.width, el.height));
      const qrImg = new Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, el.x, el.y, el.width, el.height);
    } else {
      const rawText = el.variableName.replace(/\{\{|\}\}/g, '');
      const text = resolvedData[rawText] ?? '';
      if (!text) continue;

      const fontStyle = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${el.fontSize}px "${el.fontFamily}", sans-serif`;
      ctx.font = fontStyle;
      ctx.fillStyle = el.fontColor || '#000000';
      ctx.textAlign = el.textAlign as CanvasTextAlign;
      ctx.fillText(text, el.x, el.y + el.fontSize);
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/png',
      1.0
    );
  });
}

export async function mergePdfsToSingle(pdfBytesList: Uint8Array[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  for (const pdfBytes of pdfBytesList) {
    const srcPdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const mergedBytes = await mergedPdf.save();
  return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
