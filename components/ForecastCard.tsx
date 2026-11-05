import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette, zoneColor } from '@/constants/Palette';
import type { TKey, Translate } from '@/i18n';
import { forecastText } from '@/utils/describe';
import { FORECAST_MIN_POINTS } from '@/utils/forecast';
import type { Forecast } from '@/utils/forecast';

const LABELS: Record<number, TKey> = { 1: 'forecastTomorrow', 3: 'forecastIn3', 7: 'forecastIn7' };

function Cell({ label, score, color, order }: { label: string; score: number; color: string; order: number }) {
  const inner = useThemeColor({}, 'cardAlt');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(300 + order * 150, withTiming(Math.min(100, Math.max(0, score)), { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [fill, score, order]);

  const meter = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={[styles.cell, { backgroundColor: inner }]}>
      <Text style={[styles.cellLabel, { color: muted }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cellValue, { color }]}>{score}</Text>
      <View style={[styles.meter, { backgroundColor: `${text}14` }]}>
        <Animated.View style={[styles.meterFill, { backgroundColor: color }, meter]} />
      </View>
    </View>
  );
}

type Props = {
  forecast: Forecast | null;
  score: number;
  t: Translate;
};

export default function ForecastCard({ forecast, score, t }: Props) {
  const muted = useThemeColor({}, 'muted');
  const palette = usePalette();

  if (!forecast) {
    return <Text style={{ color: muted }}>{t('forecast_none', { min: FORECAST_MIN_POINTS })}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.cells}>
        {forecast.projected.map((point, order) => (
          <Cell
            key={point.offset}
            label={t(LABELS[point.offset])}
            score={point.score}
            color={zoneColor(palette, point.score)}
            order={order}
          />
        ))}
      </View>
      <Text style={styles.headline}>{forecastText(forecast, score, t)}</Text>
      <Text style={[styles.note, { color: muted }]}>{t('forecastNote', { n: forecast.basedOn })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  cells: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 12, gap: 8 },
  cellLabel: { fontSize: 12 },
  cellValue: { fontFamily: FONTS.display, fontSize: 28, lineHeight: 34 },
  meter: { height: 3, borderRadius: 2, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 2 },
  headline: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 17 },
});
