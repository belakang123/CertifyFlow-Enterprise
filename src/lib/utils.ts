import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function formatTimestamp(epochMs: number): string {
  return new Date(epochMs).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .trim();
}

export function applyTemplateVariables(
  pattern: string,
  data: Record<string, string>
): string {
  return pattern.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? key);
}

export function getWorkerCount(): number {
  const cores = navigator.hardwareConcurrency || 4;
  return Math.min(Math.max(2, cores), 16);
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export const AVAILABLE_VARIABLES = [
  { label: '{{nama}}', description: 'Nama penerima sertifikat' },
  { label: '{{tanggal}}', description: 'Tanggal penerbitan' },
  { label: '{{id_sertifikat}}', description: 'ID unik sertifikat' },
  { label: '{{qr_code}}', description: 'QR Code dinamis' },
];

export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Raleway',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Source Serif Pro',
  'Cormorant Garamond',
  'EB Garamond',
  'Dancing Script',
  'Great Vibes',
  'Pacifico',
];
