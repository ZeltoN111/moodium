import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import Icon from '@/components/Icon';
import RollingNumber from '@/components/RollingNumber';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import { formatNumber } from '@/utils/date';
import { tap } from '@/utils/haptics';

const MAX = 14;
const TICKS = Array.from({ length: MAX + 1 }, (_, hour) => hour);

type Props = {
  value: number | null;
  onMinus: () => void;
  onPlus: () => void;
  onClear: () => void;
};

/** Hours of sleep as a big readout over a 0–14 h ruler with the healthy 7–8 h band marked. */
export default function SleepRuler({ value, onMinus, onPlus, onClear }: Props) {
  const text = useThemeColor({}, 'text');
  const strong = useThemeColor({}, 'strong');
  const onStrong = useThemeColor({}, 'onStrong');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const palette = usePalette();
  const { t, locale } = useT();
  const [rulerWidth, setRulerWidth] = useState(0);
  const position = useSharedValue(0);
  const shown = useSharedValue(0);

  // The marker glides to the new value; it fades when the value is cleared.
  useEffect(() => {
    if (!rulerWidth) return;
    if (value === null) {
      shown.value = withTiming(0, MOTION.fast);
      return;
    }
    const x = (value / MAX) * rulerWidth;
    position.value = shown.value === 0 ? x : withTiming(x, MOTION.base);
    shown.value = withTiming(1, MOTION.fast);
  }, [value, rulerWidth, position, shown]);

  const markerStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateX: position.value }] }));

  const button = (name: 'minus' | 'plus', onPress: () => void, solid: boolean) => (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={name === 'minus' ? '−0,5' : '+0,5'}
      style={({ pressed }) => [
        styles.button,
        solid ? { backgroundColor: strong } : { borderColor: border, borderWidth: 1 },
        { opacity: pressed ? 0.6 : 1 },
      ]}>
      <Icon name={name} size={20} color={solid ? onStrong : text} strokeWidth={2} />
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <Pressable onPress={onClear} accessibilityRole="button" accessibilityHint={t('notSet')} style={styles.readout}>
          <RollingNumber
            value={value}
            text={value === null ? '—' : formatNumber(value, 1, locale)}
            style={[styles.value, { color: value === null ? muted : text }]}
          />
          <Text style={[styles.unit, { color: muted }]}>{value === null ? t('notSet') : t('hoursUnit')}</Text>
        </Pressable>
        <View style={styles.buttons}>
          {button('minus', onMinus, false)}
          {button('plus', onPlus, true)}
        </View>
      </View>

      <View style={styles.ruler} onLayout={(event) => setRulerWidth(event.nativeEvent.layout.width)}>
        <View style={[styles.band, { backgroundColor: `${palette.risk.low}22` }]} />
        <View style={styles.ticks}>
          {TICKS.map((hour) => (
            <View
              key={hour}
              style={[styles.tick, { height: hour % 7 === 0 ? 18 : 10, backgroundColor: `${text}38` }]}
            />
          ))}
        </View>
        <Animated.View style={[styles.marker, { backgroundColor: tint, shadowColor: tint }, markerStyle]} />
      </View>
      <View style={styles.scale}>
        <Text style={[styles.scaleLabel, { color: muted }]}>0</Text>
        <Text style={[styles.scaleLabel, { color: palette.risk.low }]}>{t('sleepNorm')}</Text>
        <Text style={[styles.scaleLabel, { color: muted }]}>{MAX}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1 },
  value: { fontFamily: FONTS.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  unit: { fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ruler: { height: 26, justifyContent: 'flex-end' },
  band: { position: 'absolute', left: `${(7 / MAX) * 100}%`, width: `${(1 / MAX) * 100}%`, top: 0, bottom: 0, borderRadius: 4 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tick: { width: 1 },
  marker: {
    position: 'absolute',
    left: 0,
    top: -4,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    borderRadius: 1,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { fontFamily: FONTS.mono, fontSize: 10 },
});
