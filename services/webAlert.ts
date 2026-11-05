import { Alert, Platform } from 'react-native';
import type { AlertButton } from 'react-native';

/**
 * react-native-web ships `Alert.alert` as a no-op, so every confirmation and error message
 * silently disappears in the browser. This maps it onto window.alert / window.confirm.
 */
export function installWebAlert() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = buttons ?? [];
    const cancel = actions.find((button) => button.style === 'cancel');
    const confirmButton = actions.find((button) => button.style !== 'cancel');

    if (actions.length > 1) {
      if (window.confirm(text)) {
        confirmButton?.onPress?.();
      } else {
        cancel?.onPress?.();
      }
      return;
    }
    window.alert(text);
    actions[0]?.onPress?.();
  };
}
