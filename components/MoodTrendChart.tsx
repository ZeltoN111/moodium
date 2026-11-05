import { StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { moodLabel } from '@/components/MoodPicker';
import TrendChart from '@/components/TrendChart';
import { useT } from '@/context/Settings';
import type { Entry } from '@/database/types';
import { formatDayLabel } from '@/utils/date';

/** Keeps the x-axis readable when a month has many entries. */
const MAX_LABELS = 6;

type Props = {
  entries: Entry[];
};

export default function MoodTrendChart({ entries }: Props) {
  const muted = useThemeColor({}, 'muted');
  const { t, locale } = useT();

  if (entries.length < 2) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: muted, textAlign: 'center' }}>{t('trendEmpty')}</Text>
      </View>
    );
  }

  const labelStep = Math.ceil(entries.length / MAX_LABELS);

  return (
    <TrendChart
      gradientId="mood-trend"
      values={entries.map((entry) => entry.mood)}
      min={1}
      max={5}
      levels={[5, 4, 3, 2, 1]}
      height={150}
      xLabels={entries.map((entry, index) => (index % labelStep === 0 ? entry.date.slice(8) : ''))}
      pointLabels={entries.map((entry) => formatDayLabel(entry.date, locale))}
      formatValue={(value) => moodLabel(t, Math.round(value))}
    />
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 36, paddingHorizontal: 12, alignItems: 'center' },
});
