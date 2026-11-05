import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';

const POLL_MS = 4000;

type Props = {
  email: string;
  password: string;
  onBack: () => void;
};

/**
 * "Check your inbox" page. The confirmation link opens in another tab or app, so this page keeps
 * trying to sign in; the moment the email is confirmed it succeeds and the app opens.
 */
export default function ConfirmEmail({ email, password, onBack }: Props) {
  const { t } = useSettings();
  const { signIn, resendConfirmation } = useSync();
  const [note, setNote] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    const timer = setInterval(() => {
      signIn(email, password).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [email, password, signIn]);

  async function resend() {
    const error = await resendConfirmation(email);
    setNote(error ?? t('confirmResent'));
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: tintSoft }]}>
        <Icon name="mail" size={30} color={tint} strokeWidth={1.8} />
      </View>
      <Text style={styles.title}>{t('confirmTitle')}</Text>
      <Text style={[styles.body, { color: muted }]}>{t('confirmBody', { email })}</Text>
      <View style={styles.waiting}>
        <ActivityIndicator size="small" color={tint} />
        <Text style={[styles.small, { color: muted }]}>{t('confirmWaiting')}</Text>
      </View>
      {note && <Text style={[styles.small, { color: muted }]}>{note}</Text>}
      <Pressable onPress={resend} accessibilityRole="button" style={[styles.button, { backgroundColor: tintSoft }]}>
        <Text style={[styles.buttonLabel, { color: tint }]}>{t('confirmResend')}</Text>
      </Pressable>
      <Pressable onPress={onBack} accessibilityRole="button" hitSlop={8} style={styles.back}>
        <Text style={[styles.small, { color: tint, fontWeight: '600' }]}>{t('confirmBack')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  badge: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  small: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  button: { alignSelf: 'stretch', height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  back: { marginTop: 16 },
});
