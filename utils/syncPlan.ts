/** Decides what to copy where when merging the local journal with the cloud copy. Pure — no I/O. */

export type LocalState = { date: string; updatedAt: number };
export type LocalTombstone = { date: string; deletedAt: number };
export type RemoteState = { date: string; updatedAt: number; deleted: boolean };

export type SyncPlan = {
  /** Local entries the cloud is missing or has an older version of. */
  push: string[];
  /** Local deletions to tell the cloud about. */
  pushDelete: string[];
  /** Cloud entries to save locally. */
  pull: string[];
  /** Entries the cloud says were deleted elsewhere. */
  deleteLocal: string[];
};

/** Local timestamps look like "2026-03-20 08:15:00" (UTC); Postgres sends ISO strings. */
export function toMillis(value: string): number {
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const ms = Date.parse(iso);
  // The local clock has whole-second precision; compare at that precision on both sides.
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000) * 1000;
}

/** Last write wins per day. On a tie between an edit and a deletion, the deletion wins. */
export function planSync(
  local: LocalState[],
  tombstones: LocalTombstone[],
  remote: RemoteState[]
): SyncPlan {
  const plan: SyncPlan = { push: [], pushDelete: [], pull: [], deleteLocal: [] };
  const live = new Map(local.map((row) => [row.date, row.updatedAt]));
  const dead = new Map(tombstones.map((row) => [row.date, row.deletedAt]));
  const cloud = new Map(remote.map((row) => [row.date, row]));
  const dates = new Set([...live.keys(), ...dead.keys(), ...cloud.keys()]);

  for (const date of [...dates].sort()) {
    const mine = live.get(date);
    const gone = dead.get(date);
    const theirs = cloud.get(date);

    if (mine !== undefined) {
      if (!theirs) plan.push.push(date);
      else if (theirs.deleted) (mine > theirs.updatedAt ? plan.push : plan.deleteLocal).push(date);
      else if (mine > theirs.updatedAt) plan.push.push(date);
      else if (mine < theirs.updatedAt) plan.pull.push(date);
    } else if (gone !== undefined) {
      if (!theirs) plan.pushDelete.push(date);
      else if (!theirs.deleted) (gone >= theirs.updatedAt ? plan.pushDelete : plan.pull).push(date);
    } else if (theirs && !theirs.deleted) {
      plan.pull.push(date);
    }
  }
  return plan;
}
