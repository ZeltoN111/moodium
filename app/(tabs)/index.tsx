import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View as RNView,
  useWindowDimensions,
} from 'react-native';

import { BentoGrid, IconButton, Screen, Tile } from '@/components/Bento';
import Icon from '@/components/Icon';

import FactorPicker from '@/components/FactorPicker';
import IntensityPicker from '@/components/IntensityPicker';
import MoodPicker from '@/components/MoodPicker';
import MoodSignal from '@/components/MoodSignal';
import RollingNumber from '@/components/RollingNumber';
import ScalePicker from '@/components/ScalePicker';
import SleepRuler from '@/components/SleepRuler';
import TagInput from '@/components/TagInput';
import { Text, View, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { usePalette } from '@/constants/Palette';
import { useSettings } from '@/context/Settings';
import { useSync } from '@/context/Sync';
import { deleteEntry, getEntriesInRange, getEntryByDate, getFactors, saveEntry } from '@/database/queries';
import type { EntryWithRelations } from '@/database/queries';
import type { Factor } from '@/database/types';
import { maybeSendBurnoutAlert } from '@/services/alerts';
import { formatDayLabel, shiftDay, todayKey } from '@/utils/date';
import { estimateIntensity } from '@/utils/intensity';
import { success, tap } from '@/utils/haptics';

const DEFAULT_SLEEP = 7.5;
const MAX_SLEEP = 14;
/** Days shown in the signal trace at the top of the screen. */
const TRACE_DAYS = 14;

export default function TodayScreen() {
  const db = useSQLiteContext();
  const { settings, update, t, locale } = useSettings();
  const { requestSync, version: syncVersion } = useSync();
  const params = useLocalSearchParams<{ date?: string; ts?: string }>();
  const today = todayKey();

  const [date, setDate] = useState(params.date ?? today);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [entry, setEntry] = useState<EntryWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [mood, setMood] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(5);
  /** False while intensity follows the estimate; true once the user set it by hand (or it was saved). */
  const [intensityManual, setIntensityManual] = useState(false);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [workload, setWorkload] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [factorIds, setFactorIds] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [trace, setTrace] = useState<Record<string, number>>({});

  const estimatedIntensity = estimateIntensity({ mood, stress, workload, sleepHours });
  const effectiveIntensity = intensityManual ? intensity : estimatedIntensity;

  // Opening the screen from a History card passes ?date=… — follow it.
  useEffect(() => {
    if (params.date) {
      setDate(params.date);
    }
  }, [params.date, params.ts]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [factorRows, existing, recent] = await Promise.all([
        getFactors(db),
        getEntryByDate(db, date),
        getEntriesInRange(db, shiftDay(date, -(TRACE_DAYS - 1)), date),
      ]);
      if (cancelled) return;
      setFactors(factorRows);
      setTrace(Object.fromEntries(recent.map((row) => [row.date, row.mood])));
      applyEntry(existing);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [db, date, syncVersion]);

  function applyEntry(existing: EntryWithRelations | null) {
    setEntry(existing);
    setMood(existing?.mood ?? null);
    setIntensity(existing?.intensity ?? 5);
    setIntensityManual(existing !== null);
    setSleepHours(existing?.sleep_hours ?? null);
    setStress(existing?.stress ?? null);
    setWorkload(existing?.workload ?? null);
    setNote(existing?.note ?? '');
    setFactorIds(existing?.factorIds ?? []);
    setTags(existing?.tags ?? []);
  }

  async function handleSave() {
    if (mood === null || missing.length > 0) {
      return;
    }
    setSaving(true);
    await saveEntry(db, {
      date,
      mood,
      intensity: effectiveIntensity,
      note: note.trim() || null,
      sleepHours,
      stress,
      workload,
      factorIds,
      tags,
    });
    applyEntry(await getEntryByDate(db, date));
    setTrace((current) => ({ ...current, [date]: mood }));
    setSaving(false);

    success();
    setJustSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 1800);

    maybeSendBurnoutAlert(db, settings, update, t).catch(() => {});
    requestSync();
  }

  function handleDelete() {
    if (!entry) {
      return;
    }
    Alert.alert(t('deleteTitle'), t('deleteQuestion'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, entry.id);
          applyEntry(null);
          requestSync();
        },
      },
    ]);
  }

  function changeSleep(delta: number) {
    setSleepHours((current) =>
      Math.min(MAX_SLEEP, Math.max(0, (current ?? DEFAULT_SLEEP) + delta))
    );
  }

  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');
  const palette = usePalette();
  const compact = useWindowDimensions().width < 360;
  const titleStyle = [styles.title, compact && styles.titleCompact];

  const isToday = date === today;
  const dayTitle = isToday ? t('today') : date === shiftDay(today, -1) ? t('yesterday') : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  // The index needs all four measurements, so a day cannot be saved with any of them empty.
  const missing = [
    mood === null && t('sectionMood'),
    sleepHours === null && t('sectionSleep'),
    stress === null && t('sectionStress'),
    workload === null && t('sectionWorkload'),
  ].filter((label): label is string => Boolean(label));

  const saveLabel = justSaved ? t('saved') : entry ? t('updateEntry') : t('saveEntry');

  const dayButton = (direction: -1 | 1, disabled = false) => (
    <IconButton
      icon={direction === -1 ? 'chevron-left' : 'chevron-right'}
      label={direction === -1 ? t('prevDay') : t('nextDay')}
      disabled={disabled}
      onPress={() => {
        tap();
        setDate(shiftDay(date, direction));
      }}
    />
  );

  const heading = entry ? t('dayLogged') : t('howWasDay');
  const split = heading.lastIndexOf(' ');
  const traceValues = Array.from({ length: TRACE_DAYS }, (_, index) => {
    const day = shiftDay(date, index - (TRACE_DAYS - 1));
    return day === date ? mood : (trace[day] ?? null);
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        keyboard
        brand
        glow={mood ? palette.mood(mood) : tint}
        glowSecondary={tint}
        eyebrow={`${formatDayLabel(date, locale)}${dayTitle ? ` · ${dayTitle}` : ''}`}
        title={
          <Text style={titleStyle}>
            {split > 0 ? `${heading.slice(0, split)}\n` : ''}
            <Text style={[...titleStyle, { color: tint }]}>{split > 0 ? heading.slice(split + 1) : heading}</Text>
          </Text>
        }
        actions={
          <>
            {dayButton(-1)}
            {dayButton(1, isToday)}
          </>
        }>
        {!isToday && <Text style={[styles.hint, { color: muted }]}>{t('pastDayHint')}</Text>}
        <BentoGrid>
          <Tile span={[1, 2, 3]} bare>
            <MoodSignal values={traceValues} />
          </Tile>

          <Tile span={[1, 2, 2]} bare title={t('sectionMood')}>
            <MoodPicker value={mood} onChange={setMood} />

            <RNView style={[styles.divider, { backgroundColor: border }]} />
            <RNView style={styles.sectionHead}>
              <Text style={[LABEL, { color: muted }]}>{t('sectionIntensity')}</Text>
              <RNView style={styles.intensityAccessory}>
                {!intensityManual && (
                  <Text style={[styles.autoBadge, { color: tint, borderColor: `${tint}66` }]}>{t('intensityAuto')}</Text>
                )}
                <RollingNumber
                  value={effectiveIntensity}
                  text={`${effectiveIntensity} / 10`}
                  style={[styles.value, { color: text }]}
                />
              </RNView>
            </RNView>
            <IntensityPicker
              value={effectiveIntensity}
              onChange={(level) => {
                setIntensity(level);
                setIntensityManual(true);
              }}
            />
            <RNView style={styles.intensityFoot}>
              <Text style={[styles.intensityHint, { color: muted }]}>
                {intensityManual ? t('intensityManualHint') : t('intensityAutoHint')}
              </Text>
              {intensityManual && (
                <Pressable
                  onPress={() => setIntensityManual(false)}
                  accessibilityRole="button"
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Text style={[styles.resetLabel, { color: tint }]}>{t('intensityReset')}</Text>
                </Pressable>
              )}
            </RNView>
          </Tile>

          <Tile span={[1, 2, 1]}>
            <Text style={[LABEL, styles.sectionLabel, { color: muted }]}>{t('sectionSleep')}</Text>
            <SleepRuler
              value={sleepHours}
              onMinus={() => changeSleep(-0.5)}
              onPlus={() => changeSleep(0.5)}
              onClear={() => setSleepHours(null)}
            />

            <RNView style={[styles.divider, { backgroundColor: border }]} />
            <RNView style={styles.sectionHead}>
              <Text style={[LABEL, { color: muted }]}>{t('sectionStress')}</Text>
              <RollingNumber value={stress} text={`${stress ?? '—'} / 5`} style={[styles.value, { color: text }]} />
            </RNView>
            <ScalePicker
              value={stress}
              onChange={setStress}
              lowLabel={t('stressLow')}
              highLabel={t('stressHigh')}
              accessibilityPrefix={t('sectionStress')}
            />

            <RNView style={[styles.divider, { backgroundColor: border }]} />
            <RNView style={styles.sectionHead}>
              <Text style={[LABEL, { color: muted }]}>{t('sectionWorkload')}</Text>
              <RollingNumber value={workload} text={`${workload ?? '—'} / 5`} style={[styles.value, { color: text }]} />
            </RNView>
            <ScalePicker
              value={workload}
              onChange={setWorkload}
              lowLabel={t('workloadLow')}
              highLabel={t('workloadHigh')}
              accessibilityPrefix={t('sectionWorkload')}
            />
          </Tile>

          <Tile span={[1, 1, 1]} title={t('sectionFactors')}>
            <FactorPicker
              factors={factors}
              selectedIds={factorIds}
              onToggle={(id) =>
                setFactorIds((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
                )
              }
            />
          </Tile>

          <Tile span={[1, 1, 1]} title={t('sectionTags')}>
            <TagInput tags={tags} onChange={setTags} />
          </Tile>

          <Tile span={[1, 2, 1]} title={t('sectionNote')}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('notePlaceholder')}
              placeholderTextColor={muted}
              multiline
              style={[styles.note, { borderColor: border, color: text }]}
            />
          </Tile>

          <RNView style={styles.actions}>
            {missing.length > 0 && (
              <Text style={[styles.missing, { color: muted }]}>
                {t('saveMissing', { fields: missing.join(', ') })}
              </Text>
            )}
            <SaveButton
              label={saveLabel.replace(' ✓', '')}
              saved={justSaved}
              disabled={missing.length > 0 || saving}
              onPress={handleSave}
              tint={tint}
              onTint={onTint}
              success={palette.risk.low}
              onSuccess={palette.onData}
            />

            {entry && (
              <Pressable onPress={handleDelete} accessibilityRole="button" style={styles.deleteButton}>
                <Icon name="trash" size={16} color={danger} />
                <Text style={[styles.deleteLabel, { color: danger }]}>{t('deleteEntry')}</Text>
              </Pressable>
            )}
          </RNView>
        </BentoGrid>
      </Screen>
    </KeyboardAvoidingView>
  );
}

type SaveButtonProps = {
  label: string;
  saved: boolean;
  disabled: boolean;
  onPress: () => void;
  tint: string;
  onTint: string;
  success: string;
  onSuccess: string;
};

/** Primary button: dims while pressed and fades into the success colour after saving. */
function SaveButton({ label, saved, disabled, onPress, tint, onTint, success, onSuccess }: SaveButtonProps) {
  const done = useSharedValue(saved ? 1 : 0);

  useEffect(() => {
    done.value = withTiming(saved ? 1 : 0, MOTION.base);
  }, [done, saved]);

  const fill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(done.value, [0, 1], [tint, success]),
    shadowColor: interpolateColor(done.value, [0, 1], [tint, success]),
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button">
      {({ pressed }) => (
        <Animated.View style={[styles.saveButton, fill, { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}>
          {saved && <Icon name="check" size={20} color={onSuccess} strokeWidth={2.4} />}
          <Text style={[styles.saveLabel, { color: saved ? onSuccess : onTint }]}>{label}</Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FONTS.display, fontSize: 38, lineHeight: 42, letterSpacing: -0.8 },
  titleCompact: { fontSize: 29, lineHeight: 33 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -12, marginBottom: 16 },
  value: { fontFamily: FONTS.mono, fontSize: 12, lineHeight: 16 },
  sectionLabel: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  divider: { height: 1, marginVertical: 20 },
  intensityAccessory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoBadge: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  intensityFoot: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 10 },
  intensityHint: { flex: 1, fontSize: 12, lineHeight: 17 },
  resetLabel: { fontSize: 13, fontWeight: '600' },
  note: {
    minHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.body,
    textAlignVertical: 'top',
  },
  actions: { width: '100%', gap: 4, marginTop: 6 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 20,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  missing: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 12 },
  saveLabel: { fontFamily: FONTS.displayMedium, fontSize: 15 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  deleteLabel: { fontSize: 15, fontWeight: '500' },
});
