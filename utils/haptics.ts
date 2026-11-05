import * as Haptics from 'expo-haptics';

/** Haptics are a nicety: never let a missing engine (web, simulator) surface as an error. */
export function tap() {
  Haptics.selectionAsync().catch(() => {});
}

export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
