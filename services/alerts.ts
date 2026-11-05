import type { SQLiteDatabase } from 'expo-sqlite';

import type { Settings } from '@/context/Settings';
import { getAnalyticsEntries, getFactors } from '@/database/queries';
import type { Translate } from '@/i18n';
import { sendBurnoutAlert, sendForecastAlert } from '@/services/notifications';
import { analyze } from '@/utils/analysis';
import { shiftDay, todayKey } from '@/utils/date';

/** Forecasts further out than this are too speculative to wake the user for. */
const FORECAST_ALERT_DAYS = 3;
const LOOKBACK_DAYS = 30;

/**
 * Sends at most one notification per day, and only if the user opted in: "risk is high" when
 * it is, otherwise an early warning when the trend reaches the high zone within a few days.
 * Returns whether something went out.
 */
export async function maybeSendBurnoutAlert(
  db: SQLiteDatabase,
  settings: Settings,
  update: (patch: Partial<Settings>) => Promise<void>,
  t: Translate
): Promise<boolean> {
  const today = todayKey();
  if (!settings.alertsEnabled || settings.lastAlertDate === today) {
    return false;
  }

  const [entries, factors] = await Promise.all([
    getAnalyticsEntries(db, shiftDay(today, -(LOOKBACK_DAYS - 1)), today),
    getFactors(db),
  ]);
  const { burnout, forecast } = analyze(entries, factors.map((factor) => factor.key), today);
  if (burnout.status !== 'ok') {
    return false;
  }

  if (burnout.level === 'high') {
    await sendBurnoutAlert(t);
  } else if (forecast?.daysToHigh != null && forecast.daysToHigh <= FORECAST_ALERT_DAYS) {
    await sendForecastAlert(t, forecast.daysToHigh);
  } else {
    return false;
  }

  await update({ lastAlertDate: today });
  return true;
}
