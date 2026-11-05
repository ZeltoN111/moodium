import type { BurnoutResult, RiskKey } from './burnout';
import type { FactorImpact } from './insights';

export type AdviceId =
  | 'sleep'
  | 'overload'
  | 'load'
  | 'recovery'
  | 'mood'
  | 'lowDays'
  | 'sentiment'
  | 'factor'
  | 'keepUp'
  | 'professional';

export type AdviceItem = {
  id: AdviceId;
  params: Record<string, number>;
  /** Set for the "factor" advice, which names a factor the UI has to translate. */
  factorKey?: string;
};

const ADVICE_FOR: Record<RiskKey, AdviceId> = {
  moodLevel: 'mood',
  moodTrend: 'mood',
  lowDays: 'lowDays',
  sentiment: 'sentiment',
  sleep: 'sleep',
  load: 'load',
  recovery: 'recovery',
  overload: 'overload',
};

const MIN_RISK = 0.4;
const MAX_STEPS = 3;
const RECOMMENDED_SLEEP = 7.5;
/** A factor must lift mood by at least this much (over enough days) to be recommended. */
const MIN_FACTOR_LIFT = 0.4;
const MIN_FACTOR_DAYS = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Bedtime shift: half of the sleep deficit, in 15-minute steps, between 15 and 60 minutes. */
export function bedtimeShiftMinutes(avgSleep: number): number {
  const deficitMinutes = Math.max(0, RECOMMENDED_SLEEP - avgSleep) * 60;
  const steps = Math.round(deficitMinutes / 2 / 15);
  return Math.min(60, Math.max(15, steps * 15));
}

/**
 * Concrete next steps, ordered by how much each problem currently adds to the index.
 * Each step is a template id plus the numbers that make it specific to this user.
 */
export function buildAdvice(burnout: BurnoutResult, impacts: FactorImpact[]): AdviceItem[] {
  if (burnout.status !== 'ok') {
    return [];
  }

  const steps: AdviceItem[] = [];
  const seen = new Set<AdviceId>();

  const concerning = burnout.components
    .filter((component) => component.available && component.risk >= MIN_RISK)
    .sort((a, b) => b.points - a.points);

  for (const component of concerning) {
    const id = ADVICE_FOR[component.key];
    if (seen.has(id) || steps.length >= MAX_STEPS) continue;
    seen.add(id);

    const value = component.value ?? 0;
    switch (id) {
      case 'sleep':
        steps.push({ id, params: { avg: round1(value), minutes: bedtimeShiftMinutes(value) } });
        break;
      case 'overload':
        steps.push({ id, params: { days: value } });
        break;
      case 'load':
        steps.push({ id, params: { avg: round1(value) } });
        break;
      case 'recovery':
      case 'lowDays':
        steps.push({ id, params: { percent: Math.round(value * 100) } });
        break;
      case 'sentiment':
        steps.push({ id, params: { percent: Math.round(((1 - value) / 2) * 100) } });
        break;
      case 'mood': {
        const moodLevel = burnout.components.find((c) => c.key === 'moodLevel');
        steps.push({ id, params: { avg: round1(moodLevel?.value ?? value) } });
        break;
      }
    }
  }

  // Something that demonstrably works for this person, if there is room left.
  const booster = impacts.find(
    (impact) =>
      impact.diff >= MIN_FACTOR_LIFT && impact.withCount >= MIN_FACTOR_DAYS && impact.key !== 'work'
  );
  if (booster && steps.length < MAX_STEPS && burnout.level !== 'low') {
    steps.push({ id: 'factor', params: { diff: round1(booster.diff) }, factorKey: booster.key });
  }

  if (steps.length === 0) {
    steps.push({ id: 'keepUp', params: {} });
  }
  if (burnout.level === 'high') {
    steps.push({ id: 'professional', params: {} });
  }
  return steps;
}
