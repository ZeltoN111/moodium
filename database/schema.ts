import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'moodium.db';

const DEFAULT_FACTORS = [
  { key: 'work', label: 'Work', icon: '💼' },
  { key: 'sleep', label: 'Sleep', icon: '🌙' },
  { key: 'exercise', label: 'Exercise', icon: '🏃' },
  { key: 'social', label: 'Social', icon: '👥' },
];

const LATEST_VERSION = 2;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= LATEST_VERSION) {
    return;
  }

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        mood INTEGER NOT NULL,
        intensity INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE factors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        icon TEXT
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE entry_factors (
        entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        factor_id INTEGER NOT NULL REFERENCES factors(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, factor_id)
      );

      CREATE TABLE entry_tags (
        entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (entry_id, tag_id)
      );

      CREATE INDEX idx_entries_date ON entries(date DESC);
    `);

    for (const factor of DEFAULT_FACTORS) {
      await db.runAsync(
        'INSERT INTO factors (key, label, icon) VALUES (?, ?, ?)',
        factor.key,
        factor.label,
        factor.icon
      );
    }

    version = 1;
  }

  if (version === 1) {
    await db.execAsync(`
      ALTER TABLE entries ADD COLUMN sleep_hours REAL;
      ALTER TABLE entries ADD COLUMN stress INTEGER;
      ALTER TABLE entries ADD COLUMN workload INTEGER;

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      UPDATE factors SET icon = '💼' WHERE key = 'work';
      UPDATE factors SET icon = '🌙' WHERE key = 'sleep';
      UPDATE factors SET icon = '🏃' WHERE key = 'exercise';
      UPDATE factors SET icon = '👥' WHERE key = 'social';
    `);

    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
