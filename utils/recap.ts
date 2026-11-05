import { dayNumber, shiftDay } from './date';

type RecapEntry = { date: string; mood: number; sleep_hours: number | null };

export type Recap = {
  from: string;
  to: string;
  daysLogged: number;
  avgMood: number | null;
  /** avgMood minus the previous week's average; null if either week has no entries. */
  moodDelta: number | null;
  avgSleep: number | null;
  sleepDelta: number | null;
  best: RecapEntry | null;
  /** Only set when it differs from the best day. */
  worst: RecapEntry | null;
};

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;

function inWindow(entries: RecapEntry[], from: number, to: number) {
  return entries.filter((entry) => {
    const day = dayNumber(entry.date);
    return day >= from && day <= to;
  });
}

const sleepOf = (entries: RecapEntry[]) =>
  mean(entries.flatMap((entry) => (entry.sleep_hours === null ? [] : [entry.sleep_hours])));

/** Summary of the last 7 days (ending `today`) compared with the 7 days before. */
export function weeklyRecap(entries: RecapEntry[], today: string): Recap {
  const end = dayNumber(today);
  const week = inWindow(entries, end - 6, end);
  const previous = inWindow(entries, end - 13, end - 7);

  const avgMood = mean(week.map((entry) => entry.mood));
  const prevMood = mean(previous.map((entry) => entry.mood));
  const avgSleep = sleepOf(week);
  const prevSleep = sleepOf(previous);

  // Ties go to the more recent day.
  const byMood = [...week].sort((a, b) => a.mood - b.mood || a.date.localeCompare(b.date));
  const worst = byMood[0] ?? null;
  const best = byMood[byMood.length - 1] ?? null;

  return {
    from: shiftDay(today, -6),
    to: today,
    daysLogged: week.length,
    avgMood,
    moodDelta: avgMood !== null && prevMood !== null ? avgMood - prevMood : null,
    avgSleep,
    sleepDelta: avgSleep !== null && prevSleep !== null ? avgSleep - prevSleep : null,
    best,
    worst: best && worst && best.mood !== worst.mood ? worst : null,
  };
}
