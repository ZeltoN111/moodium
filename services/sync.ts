import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  clearTombstones,
  deleteEntryByDate,
  getAllEntries,
  getFactorIdsByKey,
  getTombstones,
  saveEntry,
  setEntryUpdatedAt,
} from '@/database/queries';
import { planSync, toMillis } from '@/utils/syncPlan';

const PAGE = 500;

type RemoteRow = {
  date: string;
  mood: number | null;
  intensity: number | null;
  note: string | null;
  sleep_hours: number | null;
  stress: number | null;
  workload: number | null;
  factors: string[];
  tags: string[];
  deleted: boolean;
  updated_at: string;
};

export type SyncResult = { pushed: number; pulled: number; removed: number };

const iso = (value: string) => new Date(toMillis(value)).toISOString();
const sqlite = (value: string) => new Date(toMillis(value)).toISOString().slice(0, 19).replace('T', ' ');

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += PAGE) out.push(items.slice(i, i + PAGE));
  return out;
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

/** Two-way merge of the local journal with the signed-in user's cloud copy, last write wins per day. */
export async function syncEntries(
  db: SQLiteDatabase,
  client: SupabaseClient,
  userId: string
): Promise<SyncResult> {
  const remote: Pick<RemoteRow, 'date' | 'updated_at' | 'deleted'>[] = [];
  for (let from = 0; ; from += 1000) {
    const page = check(
      await client.from('entries').select('date, updated_at, deleted').order('date').range(from, from + 999)
    );
    remote.push(...page);
    if (page.length < 1000) break;
  }

  const [local, tombstones, factorIds] = await Promise.all([
    getAllEntries(db),
    getTombstones(db),
    getFactorIdsByKey(db),
  ]);

  const plan = planSync(
    local.map((entry) => ({ date: entry.date, updatedAt: toMillis(entry.updated_at) })),
    tombstones.map((row) => ({ date: row.date, deletedAt: toMillis(row.deleted_at) })),
    remote.map((row) => ({ date: row.date, updatedAt: toMillis(row.updated_at), deleted: row.deleted }))
  );

  // Cloud → device first, so a failed upload cannot lose anything.
  let pulled = 0;
  for (const dates of chunks(plan.pull)) {
    const rows = check(await client.from('entries').select('*').in('date', dates)) as RemoteRow[];
    for (const row of rows) {
      if (row.deleted || row.mood === null || row.intensity === null) continue;
      await saveEntry(db, {
        date: row.date,
        mood: row.mood,
        intensity: row.intensity,
        note: row.note,
        sleepHours: row.sleep_hours,
        stress: row.stress,
        workload: row.workload,
        factorIds: row.factors.flatMap((key) => (factorIds[key] ? [factorIds[key]] : [])),
        tags: row.tags,
      });
      await setEntryUpdatedAt(db, row.date, sqlite(row.updated_at));
      pulled += 1;
    }
  }
  for (const date of plan.deleteLocal) {
    await deleteEntryByDate(db, date);
  }

  const byDate = new Map(local.map((entry) => [entry.date, entry]));
  const upserts = [
    ...plan.push.flatMap((date) => {
      const entry = byDate.get(date);
      return entry
        ? [
            {
              user_id: userId,
              date,
              mood: entry.mood,
              intensity: entry.intensity,
              note: entry.note,
              sleep_hours: entry.sleep_hours,
              stress: entry.stress,
              workload: entry.workload,
              factors: entry.factorKeys,
              tags: entry.tags,
              deleted: false,
              updated_at: iso(entry.updated_at),
            },
          ]
        : [];
    }),
    ...plan.pushDelete.map((date) => ({
      user_id: userId,
      date,
      mood: null,
      intensity: null,
      note: null,
      sleep_hours: null,
      stress: null,
      workload: null,
      factors: [],
      tags: [],
      deleted: true,
      updated_at: iso(tombstones.find((row) => row.date === date)!.deleted_at),
    })),
  ];
  for (const rows of chunks(upserts)) {
    check(await client.from('entries').upsert(rows, { onConflict: 'user_id,date' }));
  }
  await clearTombstones(db, [...plan.pushDelete, ...plan.pull]);

  return { pushed: plan.push.length + plan.pushDelete.length, pulled, removed: plan.deleteLocal.length };
}
