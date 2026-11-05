import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AuthForm from '@/components/AuthForm';
import ConfirmEmail from '@/components/ConfirmEmail';
import ForgotPassword from '@/components/ForgotPassword';
import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { authLinkError } from '@/services/supabase';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';

/** The journal is cloud-synced, so the app opens only for a signed-in user (when Supabase is configured). */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { available, ready, email, recovering } = useSync();
  const { t } = useSettings();
  const [signingUp, setSigningUp] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null);
  // Once someone is in, forget half-finished sign-in screens so signing out starts from a clean form.
  useEffect(() => {
    if (email && !recovering) {
      setForgot(false);
      setPending(null);
      setLinkNote(null);
    }
  }, [email, recovering]);

  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const [linkNote, setLinkNote] = useState(authLinkError);

  // While a password reset is in progress the user is already signed in, but must not enter yet.
  if (!available || (email && !recovering)) {
    return <>{children}</>;
  }
  if (!ready) {
    return <View style={[styles.fill, { backgroundColor: background }]} />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Icon name="logo" size={44} color={tint} strokeWidth={1.8} />
        <Text style={styles.brand}>Moodium</Text>
        {!pending && !forgot && !recovering && (
          <Text style={[styles.welcome, { color: muted }]}>{t(signingUp ? 'authWelcomeSignUp' : 'authWelcome')}</Text>
        )}
      </View>
      {linkNote && !pending && !forgot && (
        <Text style={[styles.linkNote, { color: muted }]}>
          {linkNote.code === 'otp_expired' ? t('linkExpired') : t('linkFailed', { reason: linkNote.description })}
        </Text>
      )}
      <View
        style={[
          styles.card,
          // The reset flow has a row of eight code boxes, which needs more room to stay roughly square.
          (forgot || recovering) && styles.cardWide,
          { backgroundColor: card, borderColor: border },
        ]}>
        {pending ? (
          <ConfirmEmail email={pending.email} password={pending.password} onBack={() => setPending(null)} />
        ) : forgot || recovering ? (
          <ForgotPassword onBack={() => setForgot(false)} />
        ) : (
          <AuthForm onForgot={() => setForgot(true)} onModeChange={(mode) => setSigningUp(mode === 'signUp')} onNeedsConfirmation={(credentials) => {
              setLinkNote(null);
              setPending(credentials);
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  brand: { fontFamily: FONTS.displayRegular, fontSize: 28, marginTop: 12 },
  welcome: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  linkNote: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 420, marginBottom: 16 },
  card: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: 1, padding: 20 },
  cardWide: { maxWidth: 560 },
});
