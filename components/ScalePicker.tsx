import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { withAlpha } from '@/constants/color';
import { FONTS } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { tap } from '@/utils/haptics';

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  lowLabel: string;
  highLabel: string;
  accessibilityPrefix: string;
};

const LEVELS = [1, 2, 3, 4, 5];

function Pip({ level, value, label, onPress }: { level: number; value: number | null; label: string; onPress: () => void }) {
  const text = useThemeColor({}, 'text');
  const strong = useThemeColor({}, 'strong');
  const onStrong = useThemeColor({}, 'onStrong');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const selected = level === value;
  // 0 empty · 1 filled (below the value) · 2 the value itself
  const target = selected ? 2 : value !== null && level < value ? 1 : 0;
  const state = useSharedValue(target);

  useEffect(() => {
    state.value = withTiming(target, MOTION.fast);
  }, [state, target]);

  // Colours are resolved on the JS side; the worklets only interpolate them.
  const empty = withAlpha(text, 0);
  const faint = withAlpha(text, 0.14);
  const solid = withAlpha(strong, 1);
  const ink = withAlpha(text, 1);
  const line = withAlpha(border, 1);
  const dim = withAlpha(muted, 1);
  const inverse = withAlpha(onStrong, 1);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(state.value, [0, 1, 2], [empty, faint, solid]),
    borderColor: interpolateColor(state.value, [0, 1, 2], [line, empty, solid]),
  }));
  const digit = useAnimatedStyle(() => ({ color: interpolateColor(state.value, [0, 1, 2], [dim, ink, inverse]) }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.7 : 1 }]}>
      <Animated.View style={[styles.item, box]}>
        <Animated.Text style={[styles.level, digit]}>{level}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

/** 1–5 scale of divisions filled up to the value; tapping the selected level again clears it. */
export default function ScalePicker({ value, onChange, lowLabel, highLabel, accessibilityPrefix }: Props) {
  const muted = useThemeColor({}, 'muted');

  return (
    <View>
      <View style={styles.row}>
        {LEVELS.map((level) => (
          <Pip
            key={level}
            level={level}
            value={value}
            label={`${accessibilityPrefix} ${level}`}
            onPress={() => {
              tap();
              onChange(level === value ? null : level);
            }}
          />
        ))}
      </View>
      <View style={styles.captions}>
        <Text style={[styles.caption, { color: muted }]}>{lowLabel}</Text>
        <Text style={[styles.caption, { color: muted }]}>{highLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  hit: { flex: 1 },
  item: { alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 12, borderWidth: 1 },
  level: { fontFamily: FONTS.mono, fontSize: 14 },
  captions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  caption: { fontSize: 12 },
});
