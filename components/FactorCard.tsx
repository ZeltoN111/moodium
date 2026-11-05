import { StyleSheet, View } from 'react-native';

import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { factorIcon } from '@/constants/Factors';
import type { TKey, Translate } from '@/i18n';
import { formatNumber } from '@/utils/date';
import { FACTOR_FLAT, factorSentence } from '@/utils/describe';
import type { FactorImpact } from '@/utils/insights';

const FEW_DAYS = 4;

/** Mood 1..5 → position along the track, 0..100%. */
const position = (mood: number) => `${((mood - 1) / 4) * 100}%` as `${number}%`;

type Props = {
  impact: FactorImpact;
  t: Translate;
  locale: string;
};

export default function FactorCard({ impact, t, locale }: Props) {
  const inner = useThemeColor({}, 'cardAlt');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const palette = usePalette();

  const flat = Math.abs(impact.diff) < FACTOR_FLAT;
  const up = impact.diff > 0;
  const color = flat ? muted : up ? palette.risk.low : palette.risk.high;
  const diff = formatNumber(Math.abs(impact.diff), 1, locale);
  const sentence = factorSentence(impact, t);

  const low = Math.min(impact.avgWith, impact.avgWithout);
  const high = Math.max(impact.avgWith, impact.avgWithout);
  const fewDays = Math.min(impact.withCount, impact.withoutCount) < FEW_DAYS;

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: `${tint}22` }]}>
          <Icon name={factorIcon(impact.key)} size={19} color={tint} />
        </View>
        <Text style={styles.name}>{t(`factor_${impact.key}` as TKey)}</Text>
        <View style={[styles.delta, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.deltaLabel, { color }]}>
            {flat ? '≈ 0' : `${up ? '+' : '−'}${diff}`}
          </Text>
        </View>
      </View>

      <Text style={styles.sentence}>{sentence}</Text>

      {/* Dumbbell: both averages on the same 1–5 mood scale, joined by a bar that shows the gap. */}
      <View style={styles.scaleRow}>
        <Icon name="mood-1" size={16} color={muted} />
        <View style={styles.scale}>
          <View style={[styles.line, { backgroundColor: inner }]} />
          <View
            style={[
              styles.gap,
              { left: position(low), width: `${((high - low) / 4) * 100}%` as `${number}%`, backgroundColor: color },
            ]}
          />
          <View style={[styles.dot, { left: position(impact.avgWithout), backgroundColor: muted, borderColor: card }]} />
          <View style={[styles.dot, { left: position(impact.avgWith), backgroundColor: tint, borderColor: card }]} />
        </View>
        <Icon name="mood-5" size={16} color={muted} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: tint }]} />
          <Text style={styles.legendLabel}>
            {t('scaleWith')} <Text style={styles.legendValue}>{formatNumber(impact.avgWith, 1, locale)}</Text>
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: muted }]} />
          <Text style={styles.legendLabel}>
            {t('scaleWithout')} <Text style={styles.legendValue}>{formatNumber(impact.avgWithout, 1, locale)}</Text>
          </Text>
        </View>
      </View>

      <Text style={[styles.foot, { color: muted }]}>
        {t('factorDays', { withCount: impact.withCount, withoutCount: impact.withoutCount })}
        {fewDays ? ` · ${t('factorFewDays')}` : ''}
      </Text>
    </View>
  );
}

const DOT = 18;

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  delta: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  deltaLabel: { fontFamily: FONTS.mono, fontSize: 13 },
  sentence: { fontSize: 14, lineHeight: 20 },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scale: { flex: 1, height: DOT, justifyContent: 'center', marginHorizontal: DOT / 2 },
  line: { height: 4, borderRadius: 2 },
  gap: { position: 'absolute', height: 6, borderRadius: 3, opacity: 0.85 },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    marginLeft: -DOT / 2,
    borderRadius: DOT / 2,
    borderWidth: 3,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13 },
  legendValue: { fontWeight: '800' },
  foot: { fontSize: 12, lineHeight: 17 },
});
