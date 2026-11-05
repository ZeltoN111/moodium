import { buildAdvice } from './advice';
import type { AdviceItem } from './advice';
import { burnoutSeries, calculateBurnout } from './burnout';
import type { BurnoutInput, BurnoutResult } from './burnout';
import { shiftDay } from './date';
import { forecastBurnout } from './forecast';
import type { Forecast } from './forecast';
import {
  currentStreak,
  factorImpacts,
  moodDistribution,
  sleepMoodCorrelation,
  tagStats,
} from './insights';
import type { FactorImpact, TagStat } from './insights';
import { weeklyRecap } from './recap';
import type { Recap } from './recap';

/** The journal data every insight is computed from. */
export type AnalysisEntry = BurnoutInput & { intensity: number; tags: string[] };

/** Points on the index chart. */
export const CHART_DAYS = 14;
/** Longer history used to fit the forecast. */
const SERIES_DAYS = 24;

export type Analysis = {
  burnout: BurnoutResult;
  /** Index for the last CHART_DAYS days (null where there was too little data). */
  series: { date: string; score: number | null }[];
  forecast: Forecast | null;
  advice: AdviceItem[];
  recap: Recap;
  /** Index now and a week ago, for the "change this week" figure. */
  indexWeekAgo: number | null;
  impacts: FactorImpact[];
  tags: TagStat[];
  streak: number;
  correlation: number | null;
  distribution: number[];
  total: number;
};

export function analyze(entries: AnalysisEntry[], factorKeys: string[], today: string): Analysis {
  const burnout = calculateBurnout(entries, today);
  const fullSeries = burnoutSeries(entries, today, SERIES_DAYS);
  const impacts = factorImpacts(entries, factorKeys);
  const weekAgo = calculateBurnout(entries, shiftDay(today, -7));

  return {
    burnout,
    series: fullSeries.slice(-CHART_DAYS),
    forecast:
      burnout.status === 'ok'
        ? forecastBurnout(
            fullSeries.map((point) => point.score),
            burnout.score
          )
        : null,
    advice: buildAdvice(burnout, impacts),
    recap: weeklyRecap(entries, today),
    indexWeekAgo: weekAgo.status === 'ok' ? weekAgo.score : null,
    impacts,
    tags: tagStats(entries),
    streak: currentStreak(entries, today),
    correlation: sleepMoodCorrelation(entries),
    distribution: moodDistribution(entries),
    total: entries.length,
  };
}
