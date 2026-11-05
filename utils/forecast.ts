import { slope } from './burnout';

export type ForecastTrend = 'rising' | 'falling' | 'stable';

export type Forecast = {
  trend: ForecastTrend;
  /** Index points per day, from a straight-line fit over the recent history. */
  slopePerDay: number;
  /** Projected index for tomorrow, in 3 days and in 7 days (clamped to 0–100). */
  projected: { offset: number; score: number }[];
  /** Days until the index would cross into the high-risk zone at the current pace; null if not heading there. */
  daysToHigh: number | null;
  /** How many calculated index values the fit is based on. */
  basedOn: number;
};

export const FORECAST_MIN_POINTS = 5;
const FIT_POINTS = 10;
const HIGH_THRESHOLD = 60;
/** Slopes smaller than this (index points per day) count as "stable". */
const STABLE_SLOPE = 0.6;
const MAX_HORIZON_DAYS = 14;
const OFFSETS = [1, 3, 7];

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Straight-line extrapolation of the recent burnout index. `series` is the index per day
 * (oldest first) with null where there was too little data to calculate it.
 */
export function forecastBurnout(series: (number | null)[], currentScore: number): Forecast | null {
  const points = series
    .map((score, index) => ({ x: index, y: score }))
    .filter((point): point is { x: number; y: number } => point.y !== null)
    .slice(-FIT_POINTS);

  if (points.length < FORECAST_MIN_POINTS) {
    return null;
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const perDay = slope(xs, ys);
  const meanX = xs.reduce((sum, v) => sum + v, 0) / xs.length;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / ys.length;
  const lastX = xs[xs.length - 1];
  const fittedNow = meanY + perDay * (lastX - meanX);

  const trend: ForecastTrend =
    Math.abs(perDay) < STABLE_SLOPE ? 'stable' : perDay > 0 ? 'rising' : 'falling';

  let daysToHigh: number | null = null;
  if (trend === 'rising' && currentScore < HIGH_THRESHOLD) {
    const days = Math.ceil((HIGH_THRESHOLD - fittedNow) / perDay);
    if (days >= 1 && days <= MAX_HORIZON_DAYS) {
      daysToHigh = days;
    }
  }

  return {
    trend,
    slopePerDay: perDay,
    projected: OFFSETS.map((offset) => ({
      offset,
      score: Math.round(clampScore(fittedNow + perDay * offset)),
    })),
    daysToHigh,
    basedOn: points.length,
  };
}
