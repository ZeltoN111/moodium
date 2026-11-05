import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Pressable, StyleSheet } from 'react-native';

import Icon from '@/components/Icon';
import { Text, View, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { useSettings } from '@/context/Settings';

/** Covers the app with a lock screen (biometrics / device passcode) when the user turned it on. */
export default function AppLock({ children }: { children: ReactNode }) {
  const { settings, t } = useSettings();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const onTint = useThemeColor({}, 'onTint');
  const [unlocked, setUnlocked] = useState(!settings.lockEnabled);
  const busy = useRef(false);

  const authenticate = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('unlockPrompt') });
      if (result.success) {
        setUnlocked(true);
      }
    } catch {
      // stay locked
    } finally {
      busy.current = false;
    }
  }, [t]);

  const locked = settings.lockEnabled && !unlocked;

  useEffect(() => {
    if (locked) {
      authenticate();
    }
  }, [locked, authenticate]);

  // Re-lock when the app goes to the background. "inactive" is ignored on purpose: the system
  // biometric sheet itself triggers it on iOS.
  useEffect(() => {
    if (!settings.lockEnabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        setUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, [settings.lockEnabled]);

  return (
    <>
      {children}
      {locked && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: background }]}>
          <View style={[styles.iconBadge, { borderColor: `${tint}66`, backgroundColor: `${tint}14` }]}>
            <Icon name="logo" size={44} color={tint} />
          </View>
          <Text style={styles.title}>{t('lockedTitle')}</Text>
          <Pressable
            onPress={authenticate}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, { backgroundColor: tint, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.buttonLabel, { color: onTint }]}>{t('unlock')}</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 100 },
  iconBadge: { width: 96, height: 96, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.display, fontSize: 22 },
  button: { paddingHorizontal: 36, height: 56, justifyContent: 'center', borderRadius: 20, marginTop: 8 },
  buttonLabel: { fontFamily: FONTS.displayMedium, fontSize: 15 },
});
