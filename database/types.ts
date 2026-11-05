export type Entry = {
  id: number;
  /** ISO day key, YYYY-MM-DD — one entry per calendar day. */
  date: string;
  /** 1 (awful) .. 5 (great) — maps to the emoji scale on the Home screen. */
  mood: number;
  /** 1 .. 10 — how strongly the mood was felt. */
  intensity: number;
  note: string | null;
  /** Hours slept the night before; null for entries logged before schema v2. */
  sleep_hours: number | null;
  /** 1 (calm) .. 5 (overwhelmed). */
  stress: number | null;
  /** 1 (light) .. 5 (crushing) — how heavy the work/study load felt. */
  workload: number | null;
  created_at: string;
  updated_at: string;
};

export type Factor = {
  id: number;
  key: string;
  label: string;
  icon: string | null;
};

export type Tag = {
  id: number;
  name: string;
};
