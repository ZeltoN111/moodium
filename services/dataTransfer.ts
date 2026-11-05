import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { getAllEntries, getFactorIdsByKey, saveEntry } from '@/database/queries';
import type { DemoLanguage } from '@/utils/demo';
import { generateDemoEntries } from '@/utils/demo';
import { entriesToCsv, entriesToJson, parseImport } from '@/utils/exchange';
import type { ExchangeEntry } from '@/utils/exchange';
import { todayKey } from '@/utils/date';

export type ExportFormat = 'json' | 'csv';

/** Writes all entries to a cache file and opens the share sheet. Returns false if the journal is empty. */
export async function exportEntries(db: SQLiteDatabase, format: ExportFormat): Promise<boolean> {
  const entries = await getAllEntries(db);
  if (entries.length === 0) {
    return false;
  }

  const content = format === 'json' ? entriesToJson(entries) : entriesToCsv(entries);
  if (Platform.OS === 'web') {
    // No share sheet in a desktop browser: trigger a regular download instead.
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodium-${todayKey()}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  const file = new File(Paths.cache, `moodium-${todayKey()}.${format}`);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);

  await Sharing.shareAsync(file.uri, {
    mimeType: format === 'json' ? 'application/json' : 'text/csv',
    UTI: format === 'json' ? 'public.json' : 'public.comma-separated-values-text',
  });
  return true;
}

/** Saves entries through the normal path; unknown factor keys are ignored. */
export async function saveExchangeEntries(db: SQLiteDatabase, entries: ExchangeEntry[]) {
  const factorIds = await getFactorIdsByKey(db);
  for (const entry of entries) {
    await saveEntry(db, {
      date: entry.date,
      mood: entry.mood,
      intensity: entry.intensity,
      note: entry.note,
      sleepHours: entry.sleepHours,
      stress: entry.stress,
      workload: entry.workload,
      factorIds: entry.factorKeys.flatMap((key) => (factorIds[key] ? [factorIds[key]] : [])),
      tags: entry.tags,
    });
  }
}

/** Lets the user pick a Moodium JSON export and imports it. Returns null when the picker was cancelled. */
export async function importEntries(
  db: SQLiteDatabase
): Promise<{ count: number; skipped: number } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled) {
    return null;
  }

  const asset = picked.assets[0];
  const text =
    Platform.OS === 'web'
      ? await (asset.file ?? (await (await fetch(asset.uri)).blob())).text()
      : await new File(asset.uri).text();
  const { entries, skipped } = parseImport(text);
  await saveExchangeEntries(db, entries);
  return { count: entries.length, skipped };
}

export async function loadDemoData(db: SQLiteDatabase, language: DemoLanguage): Promise<number> {
  const entries = generateDemoEntries(todayKey(), language);
  await saveExchangeEntries(db, entries);
  return entries.length;
}
