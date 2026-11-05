import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import OtpInput from '@/components/OtpInput';
import type { OtpState } from '@/components/OtpInput';
import { Text, useThemeColor } from '@/components/Themed';
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS } from '@/constants/Auth';
import { FONTS } from '@/constants/Fonts';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';
import { validatePassword } from '@/utils/password';

type Props = { onBack: () => void };
type Step = 'email' | 'code' | 'password';

/**
 * Password reset in three steps: email → one-time code (one box per digit, checked as soon as the
 * last digit is typed) → new password. The code signs the user in, so the gate keeps this screen up
 * (`recovering`) until the new password is saved.
 */
export default function ForgotPassword({ onBack }: Props) {
  const { t } = useSettings();
  const sync = useSync();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [otpState, setOtpState] = useState<OtpState>('idle');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fail = (key: Parameters<typeof t>[0], extra = '') => setMessage({ text: `${t(key)}${extra}`, error: true });

  async function sendCode(resend = false) {
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('accountInvalid');
    setBusy(true);
    setMessage(null);
    const error = await sync.requestPasswordReset(email);
    setBusy(false);
    if (error) return fail('resetSendFailed', ` ${error}`);
    setCode('');
    setOtpState('idle');
    setCooldown(RESEND_COOLDOWN_SECONDS);
    setStep('code');
    if (resend) setMessage({ text: t('resetResent'), error: false });
  }

  async function verify(value: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const error = await sync.recoverWithCode(email, value);
    if (error) {
      setOtpState('error');
      setMessage({ text: t('resetBadCode'), error: true });
      // Let the shake play, then clear the boxes so the next try starts fresh.
      setTimeout(() => {
        setCode('');
        setOtpState('idle');
        setBusy(false);
      }, 750);
      return;
    }
    setOtpState('ok');
    setMessage({ text: t('resetCodeOk'), error: false });
    setTimeout(() => {
      setStep('password');
      setMessage(null);
      setBusy(false);
    }, 650);
  }

  function changeCode(value: string) {
    setCode(value);
    if (value.length === OTP_LENGTH) verify(value);
  }

  async function savePassword() {
    if (busy) return;
    const problem = validatePassword(password);
    if (problem) {
      return fail(problem === 'short' ? 'passwordRuleShort' : problem === 'noLetter' ? 'passwordRuleLetter' : 'passwordRuleUpper');
    }
    if (password !== repeat) return fail('accountMismatch');

    setBusy(true);
    setMessage(null);
    const error = await sync.completeRecovery(password);
    setBusy(false);
    if (error === 'same-password') return fail('passwordSame');
    if (error) return fail('passwordChangeFailed', ` ${error}`);
    // Success: `recovering` is now false and the gate lets the user into the app.
  }

  async function back() {
    if (step === 'password' || sync.recovering) {
      await sync.cancelRecovery();
      setStep('email');
      setCode('');
      setPassword('');
      setRepeat('');
      setMessage(null);
      return;
    }
    if (step === 'code') {
      setStep('email');
      setMessage(null);
      return;
    }
    onBack();
  }

  const input = [styles.input, { borderColor: border, color: text }];
  const title = step === 'email' ? t('resetTitle') : step === 'code' ? t('resetEnterCode') : t('passwordNew');

  return (
    <View>
      <Text style={styles.title}>{title}</Text>

      {step === 'email' && (
        <>
          <Text style={[styles.hint, { color: muted }]}>{t('resetEmailHint')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('accountEmail')}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={() => sendCode()}
            style={input}
          />
        </>
      )}

      {step === 'code' && (
        <>
          <Text style={[styles.hint, styles.center, { color: muted }]}>
            {t('resetCodeSent', { length: OTP_LENGTH, email: email.trim() })}
          </Text>
          <View style={styles.otp}>
            <OtpInput
              value={code}
              onChange={changeCode}
              length={OTP_LENGTH}
              state={otpState}
              disabled={busy}
              autoFocus
              label={t('resetEnterCode')}
            />
          </View>
        </>
      )}

      {step === 'password' && (
        <>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('passwordNew')}
            placeholderTextColor={muted}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            autoFocus
            style={input}
          />
          <TextInput
            value={repeat}
            onChangeText={setRepeat}
            placeholder={t('passwordNewConfirm')}
            placeholderTextColor={muted}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            onSubmitEditing={savePassword}
            style={input}
          />
          <Text style={[styles.hint, { color: muted }]}>{t('passwordRulesHint')}</Text>
        </>
      )}

      {message && (
        <Text style={[styles.message, step === 'code' && styles.center, { color: message.error ? danger : muted }]}>
          {message.text}
        </Text>
      )}

      {step !== 'code' && (
        <Pressable
          onPress={step === 'email' ? () => sendCode() : savePassword}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: tint, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: onTint }]}>
            {step === 'email' ? t('resetSendCode') : t('resetSubmit')}
          </Text>
        </Pressable>
      )}

      {step === 'code' && (
        <>
          <Pressable
            onPress={() => sendCode(true)}
            disabled={cooldown > 0 || busy}
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: tintSoft, opacity: cooldown > 0 ? 0.5 : 1 }]}>
            <Text style={[styles.buttonLabel, { color: tint }]}>
              {cooldown > 0 ? t('resetResendIn', { seconds: cooldown }) : t('resetResend')}
            </Text>
          </Pressable>
          <Text style={[styles.hint, styles.center, { color: muted }]}>{t('resetCheckSpam')}</Text>
        </>
      )}

      <Pressable onPress={back} accessibilityRole="button" hitSlop={8} style={styles.back}>
        <Text style={[styles.backLabel, { color: tint }]}>{t('confirmBack')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  center: { textAlign: 'center' },
  otp: { marginTop: 20 },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONTS.body,
    marginTop: 10,
  },
  message: { fontSize: 13, lineHeight: 18, marginTop: 14 },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  back: { alignSelf: 'center', marginTop: 16 },
  backLabel: { fontSize: 13, fontWeight: '600' },
});
