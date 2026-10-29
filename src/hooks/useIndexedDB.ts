import { useState, useCallback } from 'react';
import { db } from '@/db';
import type { Template, LayoutConfig, CustomFont, BatchHistoryEntry } from '@/types/certificate';
import { generateId } from '@/lib/utils';

export function useIndexedDB() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Templates
  const saveTemplate = useCallback(async (
    name: string,
    fileBlob: Blob,
    fileType: string,
    dimensions: Template['dimensions']
  ): Promise<string> => {
    setLoading(true);
    try {
      const id = generateId();
      await db.templates.add({ id, name, fileBlob, fileType, dimensions, createdAt: Date.now() });
      return id;
    } catch (e) {
      setError(String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplates = useCallback(async (): Promise<Template[]> => {
    return db.templates.orderBy('createdAt').reverse().toArray();
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    await db.templates.delete(id);
    await db.layoutConfigs.where('templateId').equals(id).delete();
  }, []);

  // Layout Configs
  const saveLayoutConfig = useCallback(async (config: Omit<LayoutConfig, 'id' | 'updatedAt'>): Promise<string> => {
    const id = generateId();
    await db.layoutConfigs.add({ ...config, id, updatedAt: Date.now() });
    return id;
  }, []);

  const updateLayoutConfig = useCallback(async (id: string, updates: Partial<LayoutConfig>): Promise<void> => {
    await db.layoutConfigs.update(id, { ...updates, updatedAt: Date.now() });
  }, []);

  const getLayoutConfigs = useCallback(async (templateId: string): Promise<LayoutConfig[]> => {
    return db.layoutConfigs.where('templateId').equals(templateId).toArray();
  }, []);

  const deleteLayoutConfig = useCallback(async (id: string): Promise<void> => {
    await db.layoutConfigs.delete(id);
  }, []);

  // Custom Fonts
  const saveCustomFont = useCallback(async (fontName: string, fontBlob: Blob): Promise<string> => {
    const id = generateId();
    await db.customFonts.add({ id, fontName, fontBlob });
    return id;
  }, []);

  const getCustomFonts = useCallback(async (): Promise<CustomFont[]> => {
    return db.customFonts.toArray();
  }, []);

  // Batch History
  const saveBatchHistory = useCallback(async (entry: Omit<BatchHistoryEntry, 'id'>): Promise<void> => {
    const id = generateId();
    await db.batchHistory.add({ ...entry, id });
  }, []);

  const getBatchHistory = useCallback(async (): Promise<BatchHistoryEntry[]> => {
    return db.batchHistory.orderBy('completedAt').reverse().toArray();
  }, []);

  return {
    loading,
    error,
    saveTemplate,
    getTemplates,
    deleteTemplate,
    saveLayoutConfig,
    updateLayoutConfig,
    getLayoutConfigs,
    deleteLayoutConfig,
    saveCustomFont,
    getCustomFonts,
    saveBatchHistory,
    getBatchHistory,
  };
}
