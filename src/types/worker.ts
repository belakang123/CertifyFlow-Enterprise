export interface WorkerTask {
  taskId: string;
  workerIndex: number;
  templateBytes: ArrayBuffer;
  templateFileType: string;
  templateDimensions: { width: number; height: number };
  dataRow: Record<string, string>;
  layoutElements: import('./certificate').LayoutElement[];
  fieldMappings: import('./certificate').FieldMapping[];
  exportFormat: import('./certificate').ExportFormat;
  outputFilename: string;
  customFonts: { fontName: string; fontData: ArrayBuffer }[];
}

export interface WorkerResult {
  taskId: string;
  outputFilename: string;
  blob: Blob | null;
  error?: string;
  renderTimeMs: number;
}

export interface WorkerMessage {
  type: 'progress' | 'result' | 'error';
  payload: WorkerResult;
}
