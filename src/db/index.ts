import Dexie, { type Table } from 'dexie';
import type { Template, LayoutConfig, CustomFont, BatchHistoryEntry } from '@/types/certificate';

export class CertifyFlowDatabase extends Dexie {
  templates!: Table<Template>;
  layoutConfigs!: Table<LayoutConfig>;
  customFonts!: Table<CustomFont>;
  batchHistory!: Table<BatchHistoryEntry>;

  constructor() {
    super('CertifyFlowDB');
    this.version(1).stores({
      templates: 'id, name, fileType, createdAt',
      layoutConfigs: 'id, templateId, title, updatedAt',
      customFonts: 'id, fontName',
      batchHistory: 'id, completedAt',
    });
  }
}

export const db = new CertifyFlowDatabase();
