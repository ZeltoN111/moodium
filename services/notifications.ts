import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Translate } from '@/i18n';

const REMINDER_ID = 'daily-reminder';
const CHANNEL_ID = 'default';

// Without a handler, notifications that fire while the app is open are silently dropped.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Moodium',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Asks for permission if needed. Returns whether notifications are allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** (Re)schedules the daily reminder, or removes it when disabled. */
export async function syncDailyReminder(
  enabled: boolean,
  hour: number,
  minute: number,
  t: Translate
) {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (!enabled) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: t('reminderNotifTitle'), body: t('reminderNotifBody') },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // Scheduling is unsupported in some environments (e.g. web); the reminder is best-effort.
  }
}

/** Early warning: the index is not high yet, but the trend says it will be within days. */
export async function sendForecastAlert(t: Translate, days: number) {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: t('forecastAlertTitle'), body: t('forecastAlertBody', { days }) },
      trigger: null,
    });
  } catch {
    // best-effort
  }
}

export async function sendBurnoutAlert(t: Translate) {
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title: t('alertNotifTitle'), body: t('alertNotifBody') },
      trigger: null,
    });
  } catch {
    // best-effort
  }
}
