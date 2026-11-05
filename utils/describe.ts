import type { TKey, Translate } from '../i18n';
import type { AdviceItem } from './advice';
import type { RiskComponent } from './burnout';
import type { Forecast } from './forecast';
import type { FactorImpact } from './insights';

/** Wording shared by the screens and the PDF report, so both always say the same thing. */

export type SignalStatus = 'ok' | 'watch' | 'high';

export function statusFor(risk: number): SignalStatus {
  if (risk < 0.35) return 'ok';
  if (risk < 0.6) return 'watch';
  return 'high';
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** The measurement behind a signal, in plain words ("6 h of sleep per night (goal 7.5 h)"). */
export function describeSignal(component: RiskComponent, t: Translate): string {
  const value = component.value ?? 0;
  switch (component.key) {
    case 'moodLevel':
      return t('value_moodLevel', { avg: round1(value) });
    case 'moodTrend': {
      const perWeek = round1(Math.abs(value) * 7);
      if (perWeek < 0.3) return t('value_moodTrendFlat');
      return t(value < 0 ? 'value_moodTrendDown' : 'value_moodTrendUp', { perWeek });
    }
    case 'lowDays':
    case 'recovery':
      return t(`value_${component.key}` as TKey, { percent: Math.round(value * 100) });
    case 'sentiment':
      return t('value_sentiment', { percent: Math.round(((1 - value) / 2) * 100) });
    case 'sleep':
      return t('value_sleep', { avg: round1(value) });
    case 'load':
      return t('value_load', { avg: round1(value) });
    case 'overload':
      return value > 0 ? t('value_overload', { days: value }) : t('value_overloadNone');
  }
}

export function adviceText(item: AdviceItem, t: Translate): string {
  const params: Record<string, string | number> = { ...item.params };
  if (item.factorKey) {
    params.factor = t(`factor_${item.factorKey}` as TKey).toLowerCase();
  }
  return t(`advice_${item.id}` as TKey, params);
}

/** Differences smaller than this are not worth calling a pattern. */
export const FACTOR_FLAT = 0.25;

export function factorSentence(impact: FactorImpact, t: Translate): string {
  const factor = t(`factor_${impact.key}` as TKey).toLowerCase();
  if (Math.abs(impact.diff) < FACTOR_FLAT) {
    return t('factorFlat', { factor });
  }
  return t(impact.diff > 0 ? 'factorUp' : 'factorDown', {
    diff: Math.abs(impact.diff).toFixed(1),
    factor,
  });
}

export function forecastText(forecast: Forecast, score: number, t: Translate): string {
  const perWeek = round1(Math.abs(forecast.slopePerDay) * 7);
  switch (forecast.trend) {
    case 'rising':
      if (score >= 60) return t('forecast_riseHigh');
      if (forecast.daysToHigh !== null) return t('forecast_riseToHigh', { days: forecast.daysToHigh });
      return t('forecast_rising', { perWeek });
    case 'falling':
      return t('forecast_falling', { perWeek });
    case 'stable':
      return t('forecast_stable', { score });
  }
}
