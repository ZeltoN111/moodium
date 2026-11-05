import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BentoGrid, IconButton, Screen, Tile } from '@/components/Bento';
import EntryCard from '@/components/EntryCard';
import Icon from '@/components/Icon';
import MoodCalendar from '@/components/MoodCalendar';
import { MOODS, moodLabel } from '@/components/MoodPicker';
import MoodTrendChart from '@/components/MoodTrendChart';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { useSettings } from '@/context/Settings';
import { getEntriesInRange, listEntries } from '@/database/queries';
import type { EntryListItem } from '@/database/queries';
import type { Entry } from '@/database/types';
import { monthLabel, monthRange } from '@/utils/date';
import { tap } from '@/utils/haptics';

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { t, locale } = useSettings();
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [moodFilter, setMoodFilter] = useState<number | null>(null);

  const [monthEntries, setMonthEntries] = useState<Entry[]>([]);
  const [entries, setEntries] = useState<EntryListItem[]>([]);

  const load = useCallback(async () => {
    const { from, to } = monthRange(year, month);
    const [monthRows, listRows] = await Promise.all([
      getEntriesInRange(db, from, to),
      listEntries(db, {
        from,
        to,
        day: selectedDay ?? undefined,
        search: search.trim() || undefined,
        mood: moodFilter ?? undefined,
      }),
    ]);
    setMonthEntries(monthRows);
    setEntries(listRows);
  }, [db, year, month, selectedDay, search, moodFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function shiftMonth(delta: number) {
    tap();
    const shifted = new Date(year, month + delta, 1);
    setYear(shifted.getFullYear());
    setMonth(shifted.getMonth());
    setSelectedDay(null);
  }

  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const strong = useThemeColor({}, 'strong');
  const onStrong = useThemeColor({}, 'onStrong');
  const palette = usePalette();

  const moodByDay = Object.fromEntries(monthEntries.map((entry) => [entry.date, entry.mood]));

  const navButton = (direction: -1 | 1) => (
    <IconButton
      icon={direction === -1 ? 'chevron-left' : 'chevron-right'}
      label={direction === -1 ? t('prevMonth') : t('nextMonth')}
      onPress={() => shiftMonth(direction)}
    />
  );

  const chip = (
    key: string,
    selected: boolean,
    onPress: () => void,
    children: React.ReactNode,
    label: string
  ) => (
    <Pressable
      key={key}
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.filterChip,
        selected ? { backgroundColor: strong, borderColor: strong } : { borderColor: border },
      ]}>
      {children}
    </Pressable>
  );

  return (
    <Screen
      keyboard
      glow={tint}
      glowSecondary={moodFilter ? palette.mood(moodFilter) : undefined}
      eyebrow={t('historyEntries', { count: monthEntries.length })}
      title={monthLabel(year, month, locale)}
      actions={
        <>
          {navButton(-1)}
          {navButton(1)}
        </>
      }>
      <BentoGrid>
        <Tile bare>
          <MoodCalendar
            year={year}
            month={month}
            moodByDay={moodByDay}
            selectedDay={selectedDay}
            highlightMood={moodFilter}
            onSelectDay={(day) => setSelectedDay((current) => (current === day ? null : day))}
          />
        </Tile>

        <Tile span={[1, 1, 2]} title={t('moodTrend')}>
          <MoodTrendChart entries={monthEntries} />
        </Tile>

        <Tile span={[1, 2, 3]} bare>
          <View style={[styles.searchBox, { borderColor: border }]}>
            <Icon name="search" size={18} color={muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('searchNotes')}
              placeholderTextColor={muted}
              accessibilityLabel={t('searchNotes')}
              style={[styles.search, { color: text }]}
            />
          </View>

          <View style={styles.filterRow}>
            {chip(
              'all',
              moodFilter === null,
              () => setMoodFilter(null),
              <>
                <View style={[styles.dot, { backgroundColor: moodFilter === null ? onStrong : tint }]} />
                <Text style={[styles.chipLabel, { color: moodFilter === null ? onStrong : muted }]}>{t('all')}</Text>
              </>,
              t('all')
            )}
            {[...MOODS].reverse().map((mood) =>
              chip(
                String(mood.value),
                moodFilter === mood.value,
                () => setMoodFilter((current) => (current === mood.value ? null : mood.value)),
                <>
                  <View style={[styles.dot, { backgroundColor: palette.mood(mood.value) }]} />
                  <Text style={[styles.chipLabel, { color: moodFilter === mood.value ? onStrong : muted }]}>
                    {moodLabel(t, mood.value)}
                  </Text>
                </>,
                t('filterBy', { mood: moodLabel(t, mood.value) })
              )
            )}
          </View>

          {selectedDay && (
            <Pressable onPress={() => setSelectedDay(null)} style={styles.activeFilter}>
              <Text style={{ color: muted, fontSize: 12, flexShrink: 1 }}>
                {t('showingDay', { day: selectedDay })}
              </Text>
              <Icon name="x" size={14} color={muted} />
            </Pressable>
          )}
        </Tile>

        {entries.length === 0 ? (
          <Tile span={[1, 2, 3]}>
            <Text style={[styles.empty, { color: muted }]}>{t('noEntries')}</Text>
          </Tile>
        ) : (
          entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onPress={() =>
                router.navigate({ pathname: '/', params: { date: entry.date, ts: String(Date.now()) } })
              }
            />
          ))
        )}
      </BentoGrid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  search: { flex: 1, height: '100%', fontSize: 15, fontFamily: FONTS.body },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13, fontWeight: '500' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeFilter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, minHeight: 32 },
  empty: { textAlign: 'center', paddingVertical: 16 },
});
