import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';
import { validatePassword } from '@/utils/password';

type Mode = 'signIn' | 'signUp';

type Props = {
  onForgot?: () => void;
  /** The account exists but its email is not confirmed yet. */
  onNeedsConfirmation?: (credentials: { email: string; password: string }) => void;
  /** Tells the screen which form is open, so it can adjust its greeting. */
  onModeChange?: (mode: Mode) => void;
};

/** Sign-in form, and a separate registration form (name, email, password + confirmation). */
export default function AuthForm({ onForgot, onModeChange, onNeedsConfirmation }: Props) {
  const { t } = useSettings();
  const sync = useSync();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');

  const signingUp = mode === 'signUp';

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
    setPassword('');
    setConfirm('');
    onModeChange?.(next);
  }

  function validate(): string | null {
    if (signingUp && !name.trim()) return t('accountNameRequired');
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) return t('accountInvalid');
    if (signingUp) {
      // Rules apply to new passwords only, so accounts made earlier with a shorter one can still sign in.
      const problem = validatePassword(password);
      if (problem) return t(problem === 'short' ? 'passwordRuleShort' : problem === 'noLetter' ? 'passwordRuleLetter' : 'passwordRuleUpper');
      if (password !== confirm) return t('accountMismatch');
    }
    return null;
  }

  async function submit() {
    if (busy) return;
    const problem = validate();
    if (problem) {
      setMessage(problem);
      return;
    }
    setBusy(true);
    setMessage(null);
    const error = signingUp ? await sync.signUp(email, password, name) : await sync.signIn(email, password);
    setBusy(false);
    if (error === 'confirm-email' || (error && /not confirmed/i.test(error))) {
      onNeedsConfirmation?.({ email: email.trim(), password });
    } else if (error) {
      setMessage(`${t('accountFailed')} ${error}`);
    }
  }

  const input = { borderColor: border, color: text };
  const field = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    extra: Partial<React.ComponentProps<typeof TextInput>> = {}
  ) => (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={muted}
      autoCapitalize="none"
      style={[styles.input, input]}
      {...extra}
    />
  );

  return (
    <View>
      {signingUp &&
        field(name, setName, t('accountName'), { autoCapitalize: 'words', textContentType: 'name', maxLength: 40 })}
      {field(email, setEmail, t('accountEmail'), {
        autoCorrect: false,
        keyboardType: 'email-address',
        textContentType: 'emailAddress',
      })}
      {field(password, setPassword, t('accountPassword'), {
        secureTextEntry: true,
        textContentType: signingUp ? 'newPassword' : 'password',
        onSubmitEditing: signingUp ? undefined : submit,
      })}
      {signingUp &&
        field(confirm, setConfirm, t('accountPasswordConfirm'), {
          secureTextEntry: true,
          textContentType: 'newPassword',
          onSubmitEditing: submit,
        })}
      {signingUp && <Text style={[styles.rules, { color: muted }]}>{t('passwordRulesHint')}</Text>}
      {!signingUp && (
        <Pressable onPress={onForgot} accessibilityRole="button" hitSlop={8} style={styles.forgot}>
          <Text style={[styles.switchLink, { color: tint }]}>{t('forgotPassword')}</Text>
        </Pressable>
      )}
      {message && <Text style={[styles.message, { color: danger }]}>{message}</Text>}
      <Pressable
        onPress={submit}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, { backgroundColor: tint, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
        <Text style={[styles.buttonLabel, { color: onTint }]}>{signingUp ? t('createAccount') : t('signIn')}</Text>
      </Pressable>
      <View style={styles.switchRow}>
        <Text style={[styles.switchText, { color: muted }]}>
          {signingUp ? t('accountHaveAccount') : t('accountNoAccount')}
        </Text>
        <Pressable
          onPress={() => switchMode(signingUp ? 'signIn' : 'signUp')}
          accessibilityRole="button"
          hitSlop={8}>
          <Text style={[styles.switchLink, { color: tint }]}>{signingUp ? t('signIn') : t('signUp')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONTS.body,
    marginTop: 10,
  },
  forgot: { alignSelf: 'flex-end', marginTop: 12 },
  rules: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  message: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  switchText: { fontSize: 13 },
  switchLink: { fontSize: 13, fontWeight: '600' },
});
