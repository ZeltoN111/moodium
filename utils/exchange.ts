/** JSON / CSV export of the journal and validated JSON import. Pure — file access lives elsewhere. */

export type ExchangeEntry = {
  date: string;
  mood: number;
  intensity: number;
  note: string | null;
  sleepHours: number | null;
  stress: number | null;
  workload: number | null;
  factorKeys: string[];
  tags: string[];
};

type SourceEntry = {
  date: string;
  mood: number;
  intensity: number;
  note: string | null;
  sleep_hours: number | null;
  stress: number | null;
  workload: number | null;
  factorKeys: string[];
  tags: string[];
};

export function toExchangeEntries(entries: SourceEntry[]): ExchangeEntry[] {
  return entries.map((entry) => ({
    date: entry.date,
    mood: entry.mood,
    intensity: entry.intensity,
    note: entry.note,
    sleepHours: entry.sleep_hours,
    stress: entry.stress,
    workload: entry.workload,
    factorKeys: entry.factorKeys,
    tags: entry.tags,
  }));
}

export function entriesToJson(entries: SourceEntry[], exportedAt = new Date()): string {
  return JSON.stringify(
    {
      app: 'moodium',
      version: 1,
      exportedAt: exportedAt.toISOString(),
      entries: toExchangeEntries(entries),
    },
    null,
    2
  );
}

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function entriesToCsv(entries: SourceEntry[]): string {
  const header = 'date,mood,intensity,sleep_hours,stress,workload,factors,tags,note';
  const rows = entries.map((entry) =>
    [
      entry.date,
      entry.mood,
      entry.intensity,
      entry.sleep_hours,
      entry.stress,
      entry.workload,
      entry.factorKeys.join(';'),
      entry.tags.join(';'),
      entry.note,
    ]
      .map(csvCell)
      .join(',')
  );
  return [header, ...rows].join('\n');
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** null/undefined → null, in range → the number, out of range → undefined (row is invalid). */
const optionalRange = (value: unknown, min: number, max: number) =>
  value === null || value === undefined ? null : inRange(value, min, max) ? value : undefined;

export class ImportError extends Error {}

/** Parses a Moodium JSON export. Throws ImportError for a wrong file; counts rows it had to skip. */
export function parseImport(text: string): { entries: ExchangeEntry[]; skipped: number } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportError('not json');
  }
  const rows = (data as { entries?: unknown } | null)?.entries;
  if (!Array.isArray(rows)) {
    throw new ImportError('no entries');
  }

  const entries: ExchangeEntry[] = [];
  let skipped = 0;
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  for (const row of rows as Record<string, unknown>[]) {
    const sleepHours = optionalRange(row?.sleepHours, 0, 24);
    const stress = optionalRange(row?.stress, 1, 5);
    const workload = optionalRange(row?.workload, 1, 5);

    if (
      !row ||
      typeof row.date !== 'string' ||
      !DAY_KEY.test(row.date) ||
      !inRange(row.mood, 1, 5) ||
      !inRange(row.intensity, 1, 10) ||
      sleepHours === undefined ||
      stress === undefined ||
      workload === undefined
    ) {
      skipped += 1;
      continue;
    }

    entries.push({
      date: row.date,
      mood: Math.round(row.mood),
      intensity: Math.round(row.intensity),
      note: typeof row.note === 'string' && row.note.trim() ? row.note : null,
      sleepHours,
      stress,
      workload,
      factorKeys: strings(row.factorKeys),
      tags: strings(row.tags)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    });
  }

  return { entries, skipped };
}
