import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

import RollingNumber from '@/components/RollingNumber';
import { useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { paletteFor, usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import type { TKey, Translate } from '@/i18n';
import { tap } from '@/utils/haptics';

const STATIC = paletteFor('dark');

/** Mood scale. `color` is the dark-theme colour; inside components prefer usePalette().mood(). */
export const MOODS = [1, 2, 3, 4, 5].map((value) => ({ value, color: STATIC.mood(value) }));

export function moodColor(value: number): string {
  return STATIC.mood(value);
}

export function moodLabel(t: Translate, value: number): string {
  return t(`mood${value}` as TKey);
}

/** Bar heights rise with the mood, like a signal-strength meter. */
const HEIGHTS = [56, 80, 104, 124, 142];
const FIELD = 168;
const GAP = 10;
const GLOW = 220;

type BarProps = {
  index: number;
  selected: boolean;
  color: string;
  off: string;
  border: string;
  muted: string;
  label: string;
  onPress: () => void;
};

/** One bar; selecting it cross-fades its colour. */
function MoodBar({ index, selected, color, off, border, muted, label, onPress }: BarProps) {
  const lit = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    lit.value = withTiming(selected ? 1 : 0, MOTION.base);
  }, [lit, selected]);

  const bar = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(lit.value, [0, 1], [off, color]),
    borderColor: interpolateColor(lit.value, [0, 1], [border, color]),
  }));
  const number = useAnimatedStyle(() => ({ color: interpolateColor(lit.value, [0, 1], [muted, color]) }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}>
      <Animated.View style={[styles.bar, { height: HEIGHTS[index] }, bar]} />
      <Animated.Text style={[styles.index, number]}>0{index + 1}</Animated.Text>
    </Pressable>
  );
}

type Props = {
  value: number | null;
  onChange: (mood: number) => void;
};

/** Five rising bars; the chosen one lights up in its mood colour, with a soft glow and its name above. */
export default function MoodPicker({ value, onChange }: Props) {
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const cardAlt = useThemeColor({}, 'cardAlt');
  const palette = usePalette();
  const { t } = useT();
  const [rowWidth, setRowWidth] = useState(0);
  const selectedColor = value ? palette.mood(value) : muted;

  const slot = rowWidth > 0 ? (rowWidth - GAP * 4) / 5 : 0;
  const glowLeft = value && slot ? (value - 1) * (slot + GAP) + slot / 2 - GLOW / 2 : 0;

  // The name fades in on change; the glow glides to the chosen bar.
  const nameFade = useSharedValue(1);
  const glowX = useSharedValue(glowLeft);
  const glowOn = useSharedValue(0);

  useEffect(() => {
    nameFade.value = 0;
    nameFade.value = withTiming(1, MOTION.base);
  }, [value, nameFade]);

  useEffect(() => {
    if (!slot || value === null) {
      glowOn.value = withTiming(0, MOTION.base);
      return;
    }
    glowX.value = glowOn.value === 0 ? glowLeft : withTiming(glowLeft, MOTION.base);
    glowOn.value = withTiming(1, MOTION.base);
  }, [value, slot, glowLeft, glowX, glowOn]);

  const nameStyle = useAnimatedStyle(() => ({ opacity: nameFade.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOn.value, transform: [{ translateX: glowX.value }] }));

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Animated.Text numberOfLines={1} style={[styles.name, rowWidth > 0 && rowWidth < 300 && styles.nameCompact, { color: selectedColor }, nameStyle]}>
          {value ? moodLabel(t, value) : '—'}
        </Animated.Text>
        <RollingNumber value={value} text={`${value ? `0${value}` : '—'} / 05`} style={[styles.count, { color: muted }]} />
      </View>

      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        onLayout={(event) => setRowWidth(Math.floor(event.nativeEvent.layout.width))}>
        {value !== null && slot > 0 && (
          <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]}>
            <Svg width={GLOW} height={FIELD}>
              <Defs>
                <RadialGradient id={`mood-glow-${value}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={selectedColor} stopOpacity={0.36} />
                  <Stop offset="0.6" stopColor={selectedColor} stopOpacity={0.08} />
                  <Stop offset="1" stopColor={selectedColor} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={GLOW / 2} cy={FIELD * 0.58} rx={GLOW / 2} ry={FIELD * 0.42} fill={`url(#mood-glow-${value})`} />
            </Svg>
          </Animated.View>
        )}
        {MOODS.map((mood, index) => (
          <MoodBar
            key={mood.value}
            index={index}
            selected={mood.value === value}
            color={palette.mood(mood.value)}
            off={cardAlt}
            border={border}
            muted={muted}
            label={moodLabel(t, mood.value)}
            onPress={() => {
              tap();
              onChange(mood.value);
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18, width: '100%' },
  readout: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  name: { flexShrink: 1, fontFamily: FONTS.displayRegular, fontSize: 38, lineHeight: 46, letterSpacing: -0.8 },
  nameCompact: { fontSize: 29, lineHeight: 38 },
  count: { fontFamily: FONTS.mono, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: GAP, height: FIELD },
  glow: { position: 'absolute', left: 0, top: 0 },
  item: { flex: 1, height: FIELD, justifyContent: 'flex-end', gap: 10 },
  bar: { borderRadius: 14, borderWidth: 1 },
  index: { fontFamily: FONTS.mono, fontSize: 12, textAlign: 'center' },
});
