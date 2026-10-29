export type ExportFormat = 'ZIP-PDF' | 'ZIP-PNG' | 'SINGLE-PDF';

export interface Template {
  id: string;
  name: string;
  fileType: string;
  fileBlob: Blob;
  dimensions: { width: number; height: number; orientation: 'landscape' | 'portrait' };
  createdAt: number;
}

export interface LayoutElement {
  id: string;
  type: 'text' | 'qrcode' | 'date';
  variableName: string; // e.g. '{{nama}}', '{{tanggal}}', '{{id_sertifikat}}', '{{qr_code}}'
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
}

export interface LayoutConfig {
  id: string;
  templateId: string;
  title: string;
  elements: LayoutElement[];
  updatedAt: number;
}

export interface CustomFont {
  id: string;
  fontName: string;
  fontBlob: Blob;
}

export interface BatchHistoryEntry {
  id: string;
  templateName: string;
  totalGenerated: number;
  exportFormat: ExportFormat;
  executionTimeMs: number;
  completedAt: number;
}

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface FieldMapping {
  variableName: string;  // canvas variable e.g. '{{nama}}'
  csvColumn: string;     // CSV column header
}

export interface BatchConfig {
  templateId: string;
  layoutConfigId: string;
  data: Record<string, string>[];
  fieldMappings: FieldMapping[];
  exportFormat: ExportFormat;
  filenamePattern: string;
}

export interface GenerationProgress {
  total: number;
  completed: number;
  failed: number;
  speed: number; // certs per second
  activeWorkers: number;
  estimatedRemainingMs: number;
  logs: string[];
  status: 'idle' | 'running' | 'done' | 'cancelled' | 'error';
}
