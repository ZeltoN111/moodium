import * as LocalAuthentication from 'expo-local-authentication';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import type { ReactNode } from 'react';

import { BentoGrid, Screen, Tile, TileStack } from '@/components/Bento';
import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import Segmented from '@/components/Segmented';
import TimePicker from '@/components/TimePicker';
import { Text, useThemeColor } from '@/components/Themed';
import AccountTile from '@/components/AccountTile';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';
import type { ThemeSetting } from '@/context/Settings';
import { deleteAllEntries } from '@/database/queries';
import { createTranslator, resolveLanguage } from '@/i18n';
import type { LanguageSetting } from '@/i18n';
import { maybeSendBurnoutAlert } from '@/services/alerts';
import { shareReport } from '@/services/report';
import { exportEntries, importEntries, loadDemoData } from '@/services/dataTransfer';
import type { ExportFormat } from '@/services/dataTransfer';
import { requestNotificationPermission, sendTestNotification, syncDailyReminder } from '@/services/notifications';
import { ImportError } from '@/utils/exchange';
import { success, tap, warning } from '@/utils/haptics';


const pad = (value: number) => String(value).padStart(2, '0');

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { settings, update, t, language, locale } = useSettings();
  const { available: syncAvailable, requestSync } = useSync();
  const [busy, setBusy] = useState(false);

  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const border = useThemeColor({}, 'border');

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  }

  async function changeLanguage(next: LanguageSetting) {
    tap();
    await update({ language: next });
    // The scheduled notification text is baked in at schedule time, so refresh it.
    if (settings.reminderEnabled) {
      await syncDailyReminder(
        true,
        settings.reminderHour,
        settings.reminderMinute,
        createTranslator(resolveLanguage(next))
      );
    }
  }

  async function toggleReminder(enabled: boolean) {
    if (enabled && !(await requestNotificationPermission())) {
      Alert.alert(Platform.OS === 'web' ? t('permissionDeniedWeb') : t('permissionDenied'));
      return;
    }
    await update({ reminderEnabled: enabled });
    await syncDailyReminder(enabled, settings.reminderHour, settings.reminderMinute, t);
  }

  async function changeTime(hour: number, minute: number) {
    await update({ reminderHour: hour, reminderMinute: minute });
    if (settings.reminderEnabled) {
      await syncDailyReminder(true, hour, minute, t);
    }
  }

  async function toggleAlerts(enabled: boolean) {
    if (enabled && !(await requestNotificationPermission())) {
      Alert.alert(Platform.OS === 'web' ? t('permissionDeniedWeb') : t('permissionDenied'));
      return;
    }
    await update({ alertsEnabled: enabled, lastAlertDate: '' });
  }

  function handleTestNotification() {
    run(async () => {
      if (!(await requestNotificationPermission())) {
        Alert.alert(Platform.OS === 'web' ? t('permissionDeniedWeb') : t('permissionDenied'));
        return;
      }
      try {
        if (!(await sendTestNotification(t))) {
          Alert.alert(t('testNotifNotShown'));
        }
      } catch {
        Alert.alert(Platform.OS === 'web' ? t('permissionDeniedWeb') : t('permissionDenied'));
      }
    });
  }

  async function toggleLock(enabled: boolean) {
    if (!enabled) {
      await update({ lockEnabled: false });
      return;
    }
    const available =
      (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!available) {
      Alert.alert(t('lockUnavailable'));
      return;
    }
    // Prove it works before turning it on, so the user cannot lock themselves out.
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('unlockPrompt') });
    if (result.success) {
      await update({ lockEnabled: true });
    }
  }

  function handleExport(format: ExportFormat) {
    run(async () => {
      try {
        if (!(await exportEntries(db, format))) {
          Alert.alert(t('exportEmpty'));
        }
      } catch {
        Alert.alert(t('exportFailed'));
      }
    });
  }

  function handleReport() {
    run(async () => {
      try {
        if (!(await shareReport(db, t, locale))) {
          Alert.alert(t('exportEmpty'));
        }
      } catch {
        Alert.alert(t('reportFailed'));
      }
    });
  }

  function handleImport() {
    run(async () => {
      try {
        const result = await importEntries(db);
        if (result) {
          success();
          Alert.alert(
            t('importTitle'),
            t('importDone', { count: result.count, skipped: result.skipped })
          );
          requestSync();
        }
      } catch (error) {
        warning();
        Alert.alert(t('importTitle'), error instanceof ImportError ? t('importFailed') : t('exportFailed'));
      }
    });
  }

  function handleDemo() {
    run(async () => {
      const count = await loadDemoData(db, language);
      success();
      Alert.alert(t('demoData'), t('demoDone', { count }));
      requestSync();
      maybeSendBurnoutAlert(db, settings, update, t).catch(() => {});
    });
  }

  function handleDeleteAll() {
    Alert.alert(t('deleteAllTitle'), t('deleteAllQuestion'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await deleteAllEntries(db);
            warning();
            Alert.alert(t('deleteAllDone'));
            requestSync();
          }),
      },
    ]);
  }

  const row = (
    icon: IconName,
    label: string,
    options: { hint?: string; right?: React.ReactNode; onPress?: () => void; destructive?: boolean }
  ) => {
    const content = (
      <>
        <View style={[styles.rowIcon, { borderColor: options.destructive ? `${danger}66` : border }]}>
          <Icon name={icon} size={18} color={options.destructive ? danger : tint} strokeWidth={1.8} />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, options.destructive && { color: danger }]}>{label}</Text>
          {options.hint ? <Text style={[styles.rowHint, { color: muted }]}>{options.hint}</Text> : null}
        </View>
        {options.right}
      </>
    );

    return options.onPress ? (
      <Pressable
        key={label}
        onPress={options.onPress}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, { opacity: busy ? 0.4 : pressed ? 0.6 : 1 }]}>
        {content}
      </Pressable>
    ) : (
      <View key={label} style={styles.row}>
        {content}
      </View>
    );
  };

  const switchRow = (
    icon: IconName,
    label: string,
    value: boolean,
    onChange: (next: boolean) => void,
    hint?: string
  ) =>
    row(icon, label, {
      hint,
      right: (
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: `${muted}55`, true: tint }}
          thumbColor="#FFFFFF"
          // react-native-web paints the "on" thumb teal unless told otherwise.
          {...({ activeThumbColor: '#FFFFFF' } as object)}
          accessibilityLabel={label}
        />
      ),
    });

  const divider = <View style={[styles.divider, { backgroundColor: border }]} />;

  const languageOptions: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t('langAuto') },
    { value: 'uk', label: t('langUk') },
    { value: 'en', label: t('langEn') },
  ];
  const themeOptions: { value: ThemeSetting; label: string; icon: IconName }[] = [
    { value: 'auto', label: t('themeAuto'), icon: 'monitor' },
    { value: 'light', label: t('themeLight'), icon: 'sun' },
    { value: 'dark', label: t('themeDark'), icon: 'moon' },
  ];

  return (
    <Screen glow={tint} eyebrow="Moodium" title={t('tabSettings')}>
      <BentoGrid>
        <TileStack>
        <Tile title={t('settingsAppearance')}>
          <View style={styles.fill}>
            <View>
              <Text style={styles.fieldLabel}>{t('theme')}</Text>
              <Segmented
                options={themeOptions}
                value={settings.theme}
                onChange={(theme) => update({ theme })}
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>{t('language')}</Text>
              <Segmented options={languageOptions} value={settings.language} onChange={changeLanguage} />
            </View>
          </View>
        </Tile>

        {syncAvailable && (
          <Tile title={t('settingsAccount')} style={styles.grow}>
            <AccountTile />
          </Tile>
        )}
        </TileStack>

        <Tile title={t('settingsReminders')}>
          {switchRow('clock', t('dailyReminder'), settings.reminderEnabled, toggleReminder)}
          {settings.reminderEnabled && (
            <View style={styles.timeBox}>
              <Text style={[styles.fieldLabel, { color: muted }]}>{t('reminderTime')}</Text>
              <TimePicker
                hour={settings.reminderHour}
                minute={settings.reminderMinute}
                onChange={changeTime}
                hoursLabel={t('hoursAbbr')}
                minutesLabel={t('minutesAbbr')}
              />
            </View>
          )}
          {divider}
          {switchRow('alert', t('burnoutAlerts'), settings.alertsEnabled, toggleAlerts, t('burnoutAlertsHint'))}
          {divider}
          {row('bell', t('testNotification'), { onPress: handleTestNotification, hint: t('testNotificationHint') })}
        </Tile>

        <TileStack span={[1, 2, 1]}>
        {/* Biometrics do not exist in a desktop browser. */}
        {Platform.OS !== 'web' && (
          <Tile title={t('settingsPrivacy')}>
            {switchRow('shield', t('appLock'), settings.lockEnabled, toggleLock, t('appLockHint'))}
          </Tile>
        )}

        <Tile span={[1, 2, 1]} title={t('settingsData')} style={styles.grow}>
          <View style={styles.actions}>
            <View style={styles.actionCell}>
              {row('file', t('exportPdf'), { onPress: handleReport, hint: t('exportPdfHint') })}
              {row('download', t('exportJson'), { onPress: () => handleExport('json') })}
              {row('download', t('exportCsv'), { onPress: () => handleExport('csv') })}
              {row('upload', t('importJson'), { onPress: handleImport })}
            </View>
            <View style={styles.actionCell}>
              {row('sparkles', t('demoData'), { onPress: handleDemo, hint: t('demoDataHint') })}
              {row('trash', t('deleteAll'), { onPress: handleDeleteAll, destructive: true })}
            </View>
          </View>
        </Tile>
        </TileStack>
      </BentoGrid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** Last tile of a stack: takes the leftover height so the column ends level with its neighbours. */
  grow: { flex: 1 },
  // Cards in a row share one height; their content is spread top-to-bottom so nothing is left empty.
  fill: { flex: 1, justifyContent: 'space-between', gap: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  fieldGap: { marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 6 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowHint: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  timeBox: { marginTop: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 32 },
  actionCell: { flexGrow: 1, flexBasis: 280 },
});
