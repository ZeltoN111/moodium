import { StyleSheet, View } from 'react-native';

import MoodGlyph from '@/components/MoodGlyph';
import { moodLabel } from '@/components/MoodPicker';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import type { Translate } from '@/i18n';
import { formatDayLabel, formatNumber } from '@/utils/date';
import type { Recap } from '@/utils/recap';

type StatProps = {
  label: string;
  value: string;
  /** Change versus last week; null hides the arrow. */
  delta: number | null;
  /** Whether an increase is good news (mood, sleep) or bad news (burnout index). */
  upIsGood: boolean;
  digits?: number;
  t: Translate;
  locale: string;
};

function Stat({ label, value, delta, upIsGood, digits = 1, t, locale }: StatProps) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const palette = usePalette();
  const flat = delta === null || Math.abs(delta) < 10 ** -digits / 2;
  const good = delta !== null && delta > 0 === upIsGood;
  const color = flat ? muted : good ? palette.risk.low : palette.risk.high;

  return (
    <View style={[styles.stat, { borderColor: border }]}>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statDelta, { color }]} numberOfLines={2}>
        {delta === null
          ? t('recapNoPrev')
          : flat
            ? `= ${t('recapVsPrev')}`
            : `${delta > 0 ? '▲ +' : '▼ −'}${formatNumber(Math.abs(delta), digits, locale)} ${t('recapVsPrev')}`}
      </Text>
    </View>
  );
}

type Props = {
  recap: Recap;
  /** Burnout index now and a week ago; null when not available. */
  index: { now: number; weekAgo: number | null } | null;
  t: Translate;
  locale: string;
};

export default function RecapCard({ recap, index, t, locale }: Props) {
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const palette = usePalette();

  if (recap.daysLogged === 0) {
    return <Text style={{ color: muted }}>{t('recapEmpty')}</Text>;
  }

  const dayRow = (kind: 'recapBest' | 'recapWorst', day: NonNullable<Recap['best']>) => (
    <View style={styles.dayRow}>
      <MoodGlyph mood={day.mood} size={24} />
      <View style={styles.dayText}>
        <Text style={[styles.dayKind, { color: muted }]}>{t(kind)}</Text>
        <Text style={styles.dayName}>
          {formatDayLabel(day.date, locale)} · {moodLabel(t, day.mood)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.stats}>
        <Stat
          label={t('recapMood')}
          value={`${formatNumber(recap.avgMood!, 1, locale)} / 5`}
          delta={recap.moodDelta}
          upIsGood
          t={t}
          locale={locale}
        />
        <Stat
          label={t('recapSleep')}
          value={recap.avgSleep === null ? '—' : t('hoursShort', { hours: formatNumber(recap.avgSleep, 1, locale) })}
          delta={recap.sleepDelta}
          upIsGood
          t={t}
          locale={locale}
        />
        {index && (
          <Stat
            label={t('recapIndex')}
            value={String(index.now)}
            delta={index.weekAgo === null ? null : index.now - index.weekAgo}
            upIsGood={false}
            digits={0}
            t={t}
            locale={locale}
          />
        )}
        <View style={[styles.stat, { borderColor: border }]}>
          <Text style={[styles.statLabel, { color: muted }]}>{t('recapDays')}</Text>
          <Text style={styles.statValue}>{t('recapDaysOf', { count: recap.daysLogged })}</Text>
          <View style={styles.dots}>
            {Array.from({ length: 7 }, (_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i < recap.daysLogged ? palette.risk.low : border }]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.days}>
        {recap.best && dayRow('recapBest', recap.best)}
        {recap.worst && dayRow('recapWorst', recap.worst)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 150, borderRadius: 18, borderWidth: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 12 },
  statValue: { fontFamily: FONTS.display, fontSize: 22, lineHeight: 28 },
  statDelta: { fontFamily: FONTS.mono, fontSize: 10, lineHeight: 14 },
  dots: { flexDirection: 'row', gap: 4, marginTop: 6 },
  dot: { flex: 1, maxWidth: 18, height: 6, borderRadius: 3 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexBasis: 200 },
  dayText: { flexShrink: 1 },
  dayKind: { fontSize: 12 },
  dayName: { fontSize: 14, fontWeight: '500' },
});
