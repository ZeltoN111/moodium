import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Translate } from '@/i18n';

const REMINDER_ID = 'daily-reminder';
const CHANNEL_ID = 'default';

const isWeb = Platform.OS === 'web';

// Without a handler, notifications that fire while the app is open are silently dropped.
if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// --- Web: the browser Notification API. Works only while the Moodium tab is open. ---

const WEB_LAST_REMINDER_KEY = 'moodium-last-reminder';
/** A reminder still fires if the tab was throttled for a few minutes past the chosen time. */
const WEB_GRACE_MINUTES = 10;
let webReminderTimer: ReturnType<typeof setInterval> | undefined;

const webSupported = () => isWeb && typeof window !== 'undefined' && 'Notification' in window;

function showWebNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (!webSupported() || Notification.permission !== 'granted') return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      // Browsers silently replace a notification that shares a tag with an earlier one, so make each unique.
      const notification = new Notification(title, { body, tag: `${tag}-${Date.now()}`, icon: '/icon-192.png' });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      // `show` fires when the browser hands it to the OS; if it never does, something is blocking it.
      notification.onshow = () => resolve(true);
      notification.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 3000);
    } catch {
      resolve(false);
    }
  });
}

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function startWebReminder(hour: number, minute: number, t: Translate) {
  const check = () => {
    const now = new Date();
    const minutesSince = now.getHours() * 60 + now.getMinutes() - (hour * 60 + minute);
    if (minutesSince < 0 || minutesSince >= WEB_GRACE_MINUTES) return;
    // Once per day *per chosen time*: moving the reminder to another time re-arms it for today.
    const stamp = `${localDayKey(now)}@${hour}:${minute}`;
    try {
      if (localStorage.getItem(WEB_LAST_REMINDER_KEY) === stamp) return;
      localStorage.setItem(WEB_LAST_REMINDER_KEY, stamp);
    } catch {
      // storage unavailable — worst case the reminder repeats
    }
    showWebNotification(t('reminderNotifTitle'), t('reminderNotifBody'), 'daily-reminder');
  };
  check();
  webReminderTimer = setInterval(check, 30_000);
}

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
  if (isWeb) {
    if (!webSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }
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
  if (isWeb) {
    clearInterval(webReminderTimer);
    webReminderTimer = undefined;
    if (enabled && webSupported()) startWebReminder(hour, minute, t);
    return;
  }
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
  if (isWeb) {
    showWebNotification(t('forecastAlertTitle'), t('forecastAlertBody', { days }), 'forecast-alert');
    return;
  }
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
  if (isWeb) {
    showWebNotification(t('alertNotifTitle'), t('alertNotifBody'), 'burnout-alert');
    return;
  }
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

/** Fires one notification right now, so the user can check that permission and delivery work. */
export async function sendTestNotification(t: Translate): Promise<boolean> {
  if (isWeb) {
    return showWebNotification(t('testNotifTitle'), t('testNotifBody'), 'test-notification');
  }
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: t('testNotifTitle'), body: t('testNotifBody') },
    trigger: null,
  });
  return true;
}
