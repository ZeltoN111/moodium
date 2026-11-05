import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';
import { validatePassword } from '@/utils/password';

type Props = {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
};

/** Asks for the current password, then the new one twice, and enforces the password rules. */
export default function ChangePasswordModal({ visible, onClose, onChanged }: Props) {
  const { t } = useSettings();
  const { changePassword } = useSync();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const background = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const danger = useThemeColor({}, 'danger');

  function reset() {
    setCurrent('');
    setNext('');
    setRepeat('');
    setError(null);
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    if (busy) return;
    if (!current) return setError(t('passwordWrongCurrent'));
    const problem = validatePassword(next);
    if (problem) {
      return setError(t(problem === 'short' ? 'passwordRuleShort' : problem === 'noLetter' ? 'passwordRuleLetter' : 'passwordRuleUpper'));
    }
    if (next !== repeat) return setError(t('accountMismatch'));
    if (next === current) return setError(t('passwordSame'));

    setBusy(true);
    setError(null);
    const result = await changePassword(current, next);
    setBusy(false);
    if (result === 'wrong-current') return setError(t('passwordWrongCurrent'));
    if (result === 'same-password') return setError(t('passwordSame'));
    if (result) return setError(`${t('passwordChangeFailed')} ${result}`);
    reset();
    onChanged();
  }

  const input = [styles.input, { borderColor: border, color: text }];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('cancel')}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          {/* A nested Pressable swallows taps so touching the card does not close the dialog. */}
          <Pressable style={[styles.card, { backgroundColor: background, borderColor: border }]} onPress={() => {}}>
            <Text style={styles.title}>{t('changePassword')}</Text>
            <TextInput
              value={current}
              onChangeText={setCurrent}
              placeholder={t('passwordCurrent')}
              placeholderTextColor={muted}
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              style={input}
            />
            <TextInput
              value={next}
              onChangeText={setNext}
              placeholder={t('passwordNew')}
              placeholderTextColor={muted}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
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
              onSubmitEditing={submit}
              style={input}
            />
            <Text style={[styles.hint, { color: muted }]}>{t('passwordRulesHint')}</Text>
            {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}
            <View style={styles.buttons}>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { backgroundColor: tintSoft, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.buttonLabel, { color: tint }]}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={submit}
                accessibilityRole="button"
                style={({ pressed }) => [styles.button, { backgroundColor: tint, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
                <Text style={[styles.buttonLabel, { color: onTint }]}>{t('save')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </ScrollView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: 1, padding: 22 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONTS.body,
    marginTop: 10,
  },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  error: { fontSize: 13, lineHeight: 18, marginTop: 12 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  button: { flex: 1, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
});
