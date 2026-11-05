import type { SQLiteDatabase } from 'expo-sqlite';

import type { Entry, Factor } from './types';

export type EntryDraft = {
  date: string;
  mood: number;
  intensity: number;
  note: string | null;
  sleepHours: number | null;
  stress: number | null;
  workload: number | null;
  factorIds: number[];
  tags: string[];
};

/** Entry plus factor keys and tags — the shape the analytics code works on. */
export type AnalyticsEntry = Entry & { factorKeys: string[]; tags: string[] };

export type EntryWithRelations = Entry & {
  factorIds: number[];
  tags: string[];
};

export type EntryListItem = Entry & { tags: string[] };

export type EntryFilters = {
  from?: string;
  to?: string;
  day?: string;
  search?: string;
  mood?: number;
};

export function getFactors(db: SQLiteDatabase) {
  return db.getAllAsync<Factor>('SELECT * FROM factors ORDER BY id');
}

export async function listEntries(
  db: SQLiteDatabase,
  filters: EntryFilters = {}
): Promise<EntryListItem[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.day) {
    conditions.push('date = ?');
    params.push(filters.day);
  } else {
    if (filters.from) {
      conditions.push('date >= ?');
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push('date <= ?');
      params.push(filters.to);
    }
  }
  if (filters.mood) {
    conditions.push('mood = ?');
    params.push(filters.mood);
  }
  if (filters.search) {
    conditions.push('note LIKE ?');
    params.push(`%${filters.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const entries = await db.getAllAsync<Entry>(
    `SELECT * FROM entries ${where} ORDER BY date DESC`,
    ...params
  );

  if (entries.length === 0) {
    return [];
  }

  const ids = entries.map((entry) => entry.id);
  const tagRows = await db.getAllAsync<{ entry_id: number; name: string }>(
    `SELECT et.entry_id, t.name FROM entry_tags et
     JOIN tags t ON t.id = et.tag_id
     WHERE et.entry_id IN (${ids.map(() => '?').join(',')})
     ORDER BY t.name`,
    ...ids
  );

  return entries.map((entry) => ({
    ...entry,
    tags: tagRows.filter((row) => row.entry_id === entry.id).map((row) => row.name),
  }));
}

export function getEntriesInRange(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<Entry>(
    'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date',
    from,
    to
  );
}

export async function getEntryByDate(
  db: SQLiteDatabase,
  date: string
): Promise<EntryWithRelations | null> {
  const entry = await db.getFirstAsync<Entry>('SELECT * FROM entries WHERE date = ?', date);
  if (!entry) {
    return null;
  }

  const factors = await db.getAllAsync<{ factor_id: number }>(
    'SELECT factor_id FROM entry_factors WHERE entry_id = ?',
    entry.id
  );
  const tags = await db.getAllAsync<{ name: string }>(
    `SELECT t.name FROM tags t
     JOIN entry_tags et ON et.tag_id = t.id
     WHERE et.entry_id = ?
     ORDER BY t.name`,
    entry.id
  );

  return {
    ...entry,
    factorIds: factors.map((row) => row.factor_id),
    tags: tags.map((row) => row.name),
  };
}

/** Creates the entry for that day, or overwrites it if the day was already logged. */
export async function saveEntry(db: SQLiteDatabase, draft: EntryDraft): Promise<number> {
  let entryId = 0;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO entries (date, mood, intensity, note, sleep_hours, stress, workload)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         mood = excluded.mood,
         intensity = excluded.intensity,
         note = excluded.note,
         sleep_hours = excluded.sleep_hours,
         stress = excluded.stress,
         workload = excluded.workload,
         updated_at = datetime('now')`,
      draft.date,
      draft.mood,
      draft.intensity,
      draft.note,
      draft.sleepHours,
      draft.stress,
      draft.workload
    );

    const saved = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM entries WHERE date = ?',
      draft.date
    );
    entryId = saved!.id;

    await db.runAsync('DELETE FROM entry_factors WHERE entry_id = ?', entryId);
    for (const factorId of draft.factorIds) {
      await db.runAsync(
        'INSERT INTO entry_factors (entry_id, factor_id) VALUES (?, ?)',
        entryId,
        factorId
      );
    }

    await db.runAsync('DELETE FROM entry_tags WHERE entry_id = ?', entryId);
    for (const name of draft.tags) {
      await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', name);
      const tag = await db.getFirstAsync<{ id: number }>('SELECT id FROM tags WHERE name = ?', name);
      await db.runAsync('INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)', entryId, tag!.id);
    }
  });

  return entryId;
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

/** All entries from `from` (inclusive) on, with factor keys and tags attached, oldest first. */
export async function getAnalyticsEntries(
  db: SQLiteDatabase,
  from: string,
  to?: string
): Promise<AnalyticsEntry[]> {
  const entries = await db.getAllAsync<Entry>(
    'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date',
    from,
    to ?? '9999-12-31'
  );
  if (entries.length === 0) {
    return [];
  }

  const factorRows = await db.getAllAsync<{ entry_id: number; key: string }>(
    `SELECT ef.entry_id, f.key FROM entry_factors ef
     JOIN factors f ON f.id = ef.factor_id`
  );
  const tagRows = await db.getAllAsync<{ entry_id: number; name: string }>(
    `SELECT et.entry_id, t.name FROM entry_tags et
     JOIN tags t ON t.id = et.tag_id`
  );

  return entries.map((entry) => ({
    ...entry,
    factorKeys: factorRows.filter((row) => row.entry_id === entry.id).map((row) => row.key),
    tags: tagRows.filter((row) => row.entry_id === entry.id).map((row) => row.name),
  }));
}

export async function getAllEntries(db: SQLiteDatabase): Promise<AnalyticsEntry[]> {
  return getAnalyticsEntries(db, '0000-01-01');
}

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function getAllSettings(db: SQLiteDatabase): Promise<Record<string, string>> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

/** Wipes every journal entry (and orphaned tags); settings and factors stay. */
export async function deleteAllEntries(db: SQLiteDatabase) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM entries');
    await db.runAsync('DELETE FROM tags');
  });
}

/** Turns factor keys into ids so imported/demo entries can go through saveEntry. */
export async function getFactorIdsByKey(db: SQLiteDatabase): Promise<Record<string, number>> {
  const factors = await getFactors(db);
  return Object.fromEntries(factors.map((factor) => [factor.key, factor.id]));
}
