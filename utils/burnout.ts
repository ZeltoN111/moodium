import { dayNumber, keyFromDayNumber } from './date';
import { analyzeSentiment } from './sentiment';

/**
 * Burnout index: a transparent 0–100 score built from eight weighted risk signals over a
 * trailing window. Every signal maps a raw metric to a 0..1 risk, so the result can always be
 * explained ("sleep averaged 5.4 h", "mood fell 1.3 points/week").
 */

export type BurnoutInput = {
  date: string;
  mood: number;
  note: string | null;
  sleep_hours: number | null;
  stress: number | null;
  workload: number | null;
  factorKeys: string[];
};

export type RiskKey =
  | 'moodLevel'
  | 'moodTrend'
  | 'lowDays'
  | 'sentiment'
  | 'sleep'
  | 'load'
  | 'recovery'
  | 'overload';

export type RiskLevel = 'low' | 'moderate' | 'high';

export type RiskComponent = {
  key: RiskKey;
  /** 0 (no concern) .. 1 (maximum concern). */
  risk: number;
  weight: number;
  /** The raw metric the risk was derived from (average mood, slope, share…). */
  value: number | null;
  /** False when there was not enough data; such a component does not count towards the score. */
  available: boolean;
  /** How many index points this signal currently adds (all signals together add up to the score). */
  points: number;
  /** The most it could add if its risk were 100% — i.e. its share of the 100-point scale. */
  maxPoints: number;
};

export type BurnoutReason = { key: RiskKey; params: Record<string, number> };

export type BurnoutResult = {
  status: 'insufficient' | 'ok';
  score: number;
  level: RiskLevel;
  entryCount: number;
  windowDays: number;
  components: RiskComponent[];
  /** Biggest contributors first. */
  reasons: BurnoutReason[];
};

export const WINDOW_DAYS = 14;
export const MIN_ENTRIES = 3;

export const RISK_WEIGHTS: Record<RiskKey, number> = {
  moodLevel: 0.22,
  moodTrend: 0.13,
  lowDays: 0.1,
  sentiment: 0.15,
  sleep: 0.13,
  load: 0.1,
  recovery: 0.07,
  overload: 0.1,
};

const RECOMMENDED_SLEEP = 7.5;
const REASON_MIN_RISK = 0.4;
const MAX_REASONS = 3;

export function levelFor(score: number): RiskLevel {
  if (score < 35) return 'low';
  if (score < 60) return 'moderate';
  return 'high';
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Least-squares slope of y over x (units of y per unit of x). */
export function slope(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

function longestOverloadRun(entries: BurnoutInput[]): number {
  const overloaded = entries
    .filter((entry) => {
      const lowSleep = entry.sleep_hours !== null && entry.sleep_hours < 6;
      const heavy = (entry.workload ?? 0) >= 4 || (entry.stress ?? 0) >= 4;
      const both = (entry.workload ?? 0) >= 4 && (entry.stress ?? 0) >= 4;
      return (lowSleep && heavy) || both;
    })
    .map((entry) => dayNumber(entry.date))
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  overloaded.forEach((day, index) => {
    run = index > 0 && day === overloaded[index - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function calculateBurnout(
  allEntries: BurnoutInput[],
  today: string,
  windowDays = WINDOW_DAYS
): BurnoutResult {
  const end = dayNumber(today);
  const start = end - windowDays + 1;
  const entries = allEntries.filter((entry) => {
    const day = dayNumber(entry.date);
    return day >= start && day <= end;
  });

  const empty: BurnoutResult = {
    status: 'insufficient',
    score: 0,
    level: 'low',
    entryCount: entries.length,
    windowDays,
    components: [],
    reasons: [],
  };
  if (entries.length < MIN_ENTRIES) {
    return empty;
  }

  const make = (
    key: RiskKey,
    value: number | null,
    risk: number,
    available = true
  ): RiskComponent => ({
    key,
    value,
    risk: available ? clamp01(risk) : 0,
    weight: RISK_WEIGHTS[key],
    available,
    points: 0,
    maxPoints: 0,
  });

  const moods = entries.map((entry) => entry.mood);
  const avgMood = mean(moods);

  const days = entries.map((entry) => dayNumber(entry.date));
  const trendSlope = entries.length >= 4 ? slope(days, moods) : 0;

  const lowShare = moods.filter((mood) => mood <= 2).length / moods.length;

  const sentiment = analyzeSentiment(entries.map((entry) => entry.note ?? '').join('. '));

  const sleeps = entries.flatMap((entry) => (entry.sleep_hours === null ? [] : [entry.sleep_hours]));
  const avgSleep = sleeps.length >= MIN_ENTRIES ? mean(sleeps) : null;

  const loads = entries.flatMap((entry) => {
    const parts = [entry.stress, entry.workload].filter((v): v is number => v !== null);
    return parts.length ? [mean(parts)] : [];
  });
  const avgLoad = loads.length >= MIN_ENTRIES ? mean(loads) : null;

  const noRecoveryShare =
    entries.filter(
      (entry) => !entry.factorKeys.includes('exercise') && !entry.factorKeys.includes('social')
    ).length / entries.length;

  const overloadRun = longestOverloadRun(entries);
  const hasLoadData = sleeps.length >= MIN_ENTRIES || loads.length >= MIN_ENTRIES;

  const components: RiskComponent[] = [
    make('moodLevel', avgMood, (5 - avgMood) / 4),
    make('moodTrend', trendSlope, -trendSlope / 0.15, entries.length >= 4),
    make('lowDays', lowShare, lowShare / 0.5),
    make('sentiment', sentiment.score, (1 - sentiment.score) / 2, sentiment.hits >= 2),
    make('sleep', avgSleep, ((RECOMMENDED_SLEEP - (avgSleep ?? RECOMMENDED_SLEEP)) / 3), avgSleep !== null),
    make('load', avgLoad, ((avgLoad ?? 1) - 1) / 4, avgLoad !== null),
    make('recovery', noRecoveryShare, noRecoveryShare),
    make('overload', overloadRun, overloadRun / 4, hasLoadData),
  ];

  const available = components.filter((component) => component.available);
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  const weighted = available.reduce((sum, c) => sum + c.weight * c.risk, 0);
  const score = Math.round((weighted / totalWeight) * 100);

  // Express every available signal in index points: the shares of the 100-point scale.
  for (const component of available) {
    component.maxPoints = (component.weight / totalWeight) * 100;
    component.points = component.maxPoints * component.risk;
  }

  const reasons = available
    .filter((component) => component.risk >= REASON_MIN_RISK)
    .sort((a, b) => b.weight * b.risk - a.weight * a.risk)
    .slice(0, MAX_REASONS)
    .map((component) => ({ key: component.key, params: reasonParams(component) }));

  return {
    status: 'ok',
    score,
    level: levelFor(score),
    entryCount: entries.length,
    windowDays,
    components,
    reasons,
  };
}

function reasonParams(component: RiskComponent): Record<string, number> {
  const value = component.value ?? 0;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  switch (component.key) {
    case 'moodLevel':
      return { avg: round1(value) };
    case 'moodTrend':
      return { perWeek: round1(Math.abs(value) * 7) };
    case 'lowDays':
    case 'recovery':
      return { percent: Math.round(value * 100) };
    case 'sentiment':
      return { percent: Math.round(((1 - value) / 2) * 100) };
    case 'sleep':
      return { avg: round1(value) };
    case 'load':
      return { avg: round1(value) };
    case 'overload':
      return { days: value };
  }
}

/** Index for each of the last `points` days, each computed over its own trailing window. */
export function burnoutSeries(
  entries: BurnoutInput[],
  today: string,
  points = 14
): { date: string; score: number | null }[] {
  const end = dayNumber(today);
  return Array.from({ length: points }, (_, index) => {
    const date = keyFromDayNumber(end - (points - 1 - index));
    const result = calculateBurnout(entries, date);
    return { date, score: result.status === 'ok' ? result.score : null };
  });
}
