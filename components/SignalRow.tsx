import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import type { TKey, Translate } from '@/i18n';
import { RISK_WEIGHTS } from '@/utils/burnout';
import type { RiskComponent } from '@/utils/burnout';
import { formatNumber } from '@/utils/date';
import { describeSignal, statusFor } from '@/utils/describe';

const MAX_WEIGHT = Math.max(...Object.values(RISK_WEIGHTS));

type Props = {
  component: RiskComponent;
  t: Translate;
  locale?: string;
  /** Position in the list, so the bars fill one after another. */
  index?: number;
};

/**
 * One signal of the index. The track's width is the signal's weight, the fill is its measured
 * risk — so the filled area is literally the points it adds.
 */
export default function SignalRow({ component, t, locale, index = 0 }: Props) {
  const track = useThemeColor({}, 'cardAlt');
  const muted = useThemeColor({}, 'muted');
  const palette = usePalette();

  const status = statusFor(component.risk);
  const color = !component.available
    ? muted
    : status === 'high'
      ? palette.risk.high
      : status === 'watch'
        ? palette.risk.moderate
        : palette.risk.low;
  const trackWidth = `${(component.weight / MAX_WEIGHT) * 100}%` as `${number}%`;
  const target = component.available ? component.risk * 100 : 0;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withDelay(250 + index * 90, withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [fill, target, index]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <View style={[styles.row, { opacity: component.available ? 1 : 0.55 }]}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>
          {t(`signal_${component.key}` as TKey)}
          <Text style={[styles.weight, { color: muted }]}>
            {'  '}
            {t('weightShort', { w: Math.round(component.weight * 100) })}
          </Text>
        </Text>
        <Text style={[styles.points, { color }]}>
          {component.available ? `+${formatNumber(component.points, 1, locale)}` : '—'}
        </Text>
      </View>
      <View style={[styles.track, { width: trackWidth, backgroundColor: track }]}>
        {component.available && <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />}
      </View>
      <Text style={[styles.value, { color: muted }]}>
        {component.available ? describeSignal(component, t) : t('signalNoData')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  top: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  name: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  weight: { fontFamily: FONTS.mono, fontSize: 11 },
  points: { fontFamily: FONTS.mono, fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  value: { fontSize: 12, lineHeight: 17 },
});
