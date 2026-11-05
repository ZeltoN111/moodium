import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import ChangePasswordModal from '@/components/ChangePasswordModal';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';

/** Signed-in account: who, when the last sync ran, sync now, sign out. */
export default function AccountTile() {
  const { t, locale } = useSettings();
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(sync.displayName);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [nameNote, setNameNote] = useState<{ text: string; error: boolean } | null>(null);

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    const error = await sync.signOut();
    setBusy(false);
    if (error) {
      setMessage(t('signOutFailed'));
      // Never trap someone in the app: offer to leave without uploading the latest changes.
      Alert.alert(t('signOutFailed'), t('signOutForceQuestion'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('signOutForce'), style: 'destructive', onPress: () => sync.signOut(true) },
      ]);
    }
  }

  const nameChanged = name.trim() !== sync.displayName && name.trim().length > 0;

  async function saveName() {
    const error = await sync.updateDisplayName(name);
    setNameNote(error ? { text: t('nameSaveFailed'), error: true } : { text: t('nameSaved'), error: false });
  }

  const statusText =
    sync.status === 'syncing'
      ? t('syncing')
      : sync.status === 'error'
        ? t('syncError')
        : sync.lastSyncAt
          ? t('syncedAt', { time: sync.lastSyncAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
          : '';

  return (
    <View style={styles.fill}>
      <View>
      <Text style={styles.signedIn}>{t('accountSignedIn', { email: sync.email ?? '' })}</Text>
      <Text style={[styles.label, { color: muted }]}>{t('accountName')}</Text>
      <View style={styles.nameRow}>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            setNameNote(null);
          }}
          maxLength={40}
          autoCapitalize="words"
          placeholder={t('accountName')}
          placeholderTextColor={muted}
          onSubmitEditing={() => nameChanged && saveName()}
          style={[styles.input, { borderColor: border, color: textColor }]}
        />
        <Pressable
          onPress={saveName}
          disabled={!nameChanged}
          accessibilityRole="button"
          accessibilityLabel={t('nameSave')}
          style={({ pressed }) => [styles.saveButton, { backgroundColor: tintSoft, opacity: !nameChanged ? 0.4 : pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: tint }]}>{t('save')}</Text>
        </Pressable>
      </View>
      {nameNote && <Text style={[styles.hint, { color: nameNote.error ? danger : muted }]}>{nameNote.text}</Text>}
      </View>
      <View>
      <Pressable
        onPress={() => {
          setPasswordChanged(false);
          setPasswordOpen(true);
        }}
        accessibilityRole="button"
        style={({ pressed }) => [styles.passwordButton, { borderColor: border, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[styles.buttonLabel, { color: tint }]}>{t('changePassword')}</Text>
      </Pressable>
      {passwordChanged && <Text style={[styles.hint, { color: muted }]}>{t('passwordChanged')}</Text>}
      <View style={styles.statusRow}>
        {sync.status === 'syncing' && <ActivityIndicator size="small" color={tint} />}
        <Text style={[styles.hint, { color: sync.status === 'error' ? danger : muted }]}>{statusText}</Text>
      </View>
      {message && <Text style={[styles.hint, { color: danger }]}>{message}</Text>}
      <View style={styles.buttons}>
        <Pressable
          onPress={sync.syncNow}
          disabled={sync.status === 'syncing'}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: tint, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: onTint }]}>{t('syncNow')}</Text>
        </Pressable>
        <Pressable
          onPress={handleSignOut}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: tintSoft, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonLabel, { color: tint }]}>{t('signOut')}</Text>
        </Pressable>
      </View>
      </View>
      <ChangePasswordModal
        visible={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onChanged={() => {
          setPasswordOpen(false);
          setPasswordChanged(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between', gap: 14 },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '500', marginTop: 16, marginBottom: 8 },
  nameRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minWidth: 0, height: 46, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: FONTS.body },
  passwordButton: { height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveButton: { height: 46, paddingHorizontal: 18, borderRadius: 16, justifyContent: 'center' },
  signedIn: { fontSize: 15, fontWeight: '500' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  button: { flex: 1, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
});
