import { StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';

type Props = {
  label: string;
  /** 0..1 */
  fraction: number;
  color?: string;
  valueLabel?: string;
};

/** A labelled horizontal bar — the building block of the insight lists. */
export default function BarRow({ label, fraction, color, valueLabel }: Props) {
  const tint = useThemeColor({}, 'tint');
  const track = useThemeColor({}, 'cardAlt');
  const muted = useThemeColor({}, 'muted');
  const width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` as `${number}%`;

  return (
    <View style={styles.row}>
      <View style={styles.labels}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {valueLabel ? <Text style={[styles.value, { color: muted }]}>{valueLabel}</Text> : null}
      </View>
      <View style={[styles.track, { backgroundColor: track }]}>
        <View style={[styles.fill, { width, backgroundColor: color ?? tint }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 12 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  label: { fontSize: 14, flexShrink: 1 },
  value: { fontFamily: FONTS.mono, fontSize: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
