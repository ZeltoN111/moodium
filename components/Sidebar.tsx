import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import MoodGlyph from '@/components/MoodGlyph';
import { moodLabel } from '@/components/MoodPicker';
import RollingNumber from '@/components/RollingNumber';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import { getAnalyticsEntries, getEntryByDate, getFactors } from '@/database/queries';
import type { TKey } from '@/i18n';
import { analyze } from '@/utils/analysis';
import type { RiskLevel } from '@/utils/burnout';
import { shiftDay, todayKey } from '@/utils/date';
import { tap } from '@/utils/haptics';

export const SIDEBAR_WIDTH = 264;

type Pulse = {
  mood: number | null;
  score: number | null;
  level: RiskLevel | null;
  streak: number;
};

/** Today's mood, the index and the streak — recomputed whenever the user switches tabs. */
function usePulse(trigger: unknown): Pulse | null {
  const db = useSQLiteContext();
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = todayKey();
      const [entries, factors, entry] = await Promise.all([
        getAnalyticsEntries(db, shiftDay(today, -59), today),
        getFactors(db),
        getEntryByDate(db, today),
      ]);
      if (cancelled) return;
      const analysis = analyze(
        entries,
        factors.map((factor) => factor.key),
        today
      );
      const ok = analysis.burnout.status === 'ok';
      setPulse({
        mood: entry?.mood ?? null,
        score: ok ? analysis.burnout.score : null,
        level: ok ? analysis.burnout.level : null,
        streak: analysis.streak,
      });
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [db, trigger]);

  return pulse;
}

export type SidebarRoute = { key: string; name: string; title: string; icon: IconName };

type Props = {
  routes: SidebarRoute[];
  activeIndex: number;
  onNavigate: (route: SidebarRoute, index: number) => void;
};

/**
 * Navigation rail for tablets and laptops: wordmark, the tabs, and a live "right now" panel
 * at the bottom so the tall column carries real information instead of empty space.
 */
export default function Sidebar({ routes, activeIndex, onNavigate }: Props) {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const onTint = useThemeColor({}, 'onTint');
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const pulse = usePulse(activeIndex);

  const levelColor = pulse?.level ? palette.risk[pulse.level] : muted;

  return (
    <View
      style={[
        styles.rail,
        { backgroundColor: background, borderColor: border, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 },
      ]}>
      <View style={styles.brand}>
        <Icon name="logo" size={26} color={tint} strokeWidth={2} />
        <Text style={[LABEL, styles.wordmark, { color: text }]}>Moodium</Text>
      </View>

      <View style={styles.nav}>
        {routes.map((route, index) => {
          const active = index === activeIndex;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onNavigate(route, index)}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.item,
                active ? { backgroundColor: tintSoft } : hovered ? { backgroundColor: card } : null,
                { opacity: pressed ? 0.7 : 1 },
              ]}>
              <Icon name={route.icon} size={21} color={active ? tint : muted} strokeWidth={1.8} />
              <Text style={[styles.itemLabel, { color: active ? text : muted }]}>{route.title}</Text>
              {active && <View style={[styles.activeDot, { backgroundColor: tint }]} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <View style={[styles.pulse, { backgroundColor: card, borderColor: border }]}>
        <Text style={[LABEL, { color: muted }]}>{t('pulseTitle')}</Text>

        <View style={styles.pulseBlock}>
          <Text style={[styles.pulseCaption, { color: muted }]}>{t('indexShort')}</Text>
          <View style={styles.indexRow}>
            {pulse?.score !== null && pulse?.score !== undefined ? (
              <>
                <RollingNumber value={pulse.score} text={String(pulse.score)} style={[styles.indexValue, { color: levelColor }]} />
                <Text style={[styles.indexOf, { color: muted }]}>/ 100</Text>
              </>
            ) : (
              <Text style={[styles.pending, { color: muted }]}>{t('indexPending')}</Text>
            )}
          </View>
          {pulse?.level && (
            <Text style={[styles.levelLabel, { color: levelColor }]}>{t(`level_${pulse.level}` as TKey)}</Text>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: border }]} />

        <View style={styles.pulseBlock}>
          <Text style={[styles.pulseCaption, { color: muted }]}>{t('today')}</Text>
          {pulse?.mood ? (
            <View style={styles.moodRow}>
              <MoodGlyph mood={pulse.mood} size={22} />
              <Text style={[styles.moodName, { color: palette.mood(pulse.mood) }]}>{moodLabel(t, pulse.mood)}</Text>
            </View>
          ) : (
            <Text style={[styles.pending, { color: muted }]}>{t('notLoggedYet')}</Text>
          )}
        </View>

        <View style={styles.streakRow}>
          <Icon name="flame" size={16} color={pulse && pulse.streak > 0 ? palette.risk.moderate : muted} />
          <Text style={[styles.streak, { color: muted }]}>
            {pulse && pulse.streak > 0 ? t('streak', { count: pulse.streak }) : t('streakNone')}
          </Text>
        </View>

        {!pulse?.mood && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              onNavigate(routes[0], 0);
            }}
            style={({ pressed }) => [styles.cta, { backgroundColor: tint, opacity: pressed ? 0.85 : 1 }]}>
            <Icon name="pen" size={16} color={onTint} strokeWidth={2} />
            <Text style={[styles.ctaLabel, { color: onTint }]}>{t('logNow')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { width: SIDEBAR_WIDTH, paddingHorizontal: 16, borderRightWidth: StyleSheet.hairlineWidth * 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 32 },
  wordmark: { fontSize: 13, letterSpacing: 3.6 },
  nav: { gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 14, borderRadius: 14 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  spacer: { flex: 1, minHeight: 24 },
  pulse: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 14 },
  pulseBlock: { gap: 4 },
  pulseCaption: { fontSize: 12 },
  indexRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  indexValue: { fontFamily: FONTS.display, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  indexOf: { fontFamily: FONTS.mono, fontSize: 12, marginBottom: 8 },
  levelLabel: { fontSize: 13, fontWeight: '600' },
  pending: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodName: { fontFamily: FONTS.displayRegular, fontSize: 17, lineHeight: 22 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { fontFamily: FONTS.mono, fontSize: 11 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14 },
  ctaLabel: { fontSize: 14, fontWeight: '600' },
});
