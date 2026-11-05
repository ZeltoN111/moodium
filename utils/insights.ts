import { dayNumber } from './date';

type MoodEntry = { date: string; mood: number };

export type FactorImpact = {
  key: string;
  withCount: number;
  withoutCount: number;
  avgWith: number;
  avgWithout: number;
  /** avgWith − avgWithout: positive means the factor goes with better days. */
  diff: number;
};

export type TagStat = { name: string; count: number; avgMood: number };

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Average mood on days with vs. without each factor; factors with < `minDays` on either side are skipped. */
export function factorImpacts(
  entries: (MoodEntry & { factorKeys: string[] })[],
  factorKeys: string[],
  minDays = 2
): FactorImpact[] {
  return factorKeys
    .flatMap((key) => {
      const withFactor = entries.filter((entry) => entry.factorKeys.includes(key));
      const without = entries.filter((entry) => !entry.factorKeys.includes(key));
      if (withFactor.length < minDays || without.length < minDays) {
        return [];
      }
      const avgWith = mean(withFactor.map((entry) => entry.mood));
      const avgWithout = mean(without.map((entry) => entry.mood));
      return [
        {
          key,
          withCount: withFactor.length,
          withoutCount: without.length,
          avgWith,
          avgWithout,
          diff: avgWith - avgWithout,
        },
      ];
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** Per-tag usage and average mood, most used first. */
export function tagStats(entries: (MoodEntry & { tags: string[] })[], minCount = 2): TagStat[] {
  const byTag = new Map<string, number[]>();
  entries.forEach((entry) =>
    entry.tags.forEach((tag) => byTag.set(tag, [...(byTag.get(tag) ?? []), entry.mood]))
  );
  return [...byTag.entries()]
    .filter(([, moods]) => moods.length >= minCount)
    .map(([name, moods]) => ({ name, count: moods.length, avgMood: mean(moods) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Consecutive logged days ending today (or yesterday, so an unlogged today does not reset it). */
export function currentStreak(entries: { date: string }[], today: string): number {
  const logged = new Set(entries.map((entry) => dayNumber(entry.date)));
  let day = dayNumber(today);
  if (!logged.has(day)) {
    day -= 1;
  }
  let streak = 0;
  while (logged.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

export function moodDistribution(entries: MoodEntry[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  entries.forEach((entry) => {
    if (entry.mood >= 1 && entry.mood <= 5) {
      counts[entry.mood - 1] += 1;
    }
  });
  return counts;
}

/** Pearson correlation of two series, or null when it is undefined (too short / no variance). */
export function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length < 3 || xs.length !== ys.length) {
    return null;
  }
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    dx += (x - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  });
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}

/** How strongly nightly sleep tracks next-to-same-day mood, or null without enough sleep data. */
export function sleepMoodCorrelation(
  entries: (MoodEntry & { sleep_hours: number | null })[]
): number | null {
  const rows = entries.filter((entry) => entry.sleep_hours !== null);
  return pearson(
    rows.map((entry) => entry.sleep_hours as number),
    rows.map((entry) => entry.mood)
  );
}
