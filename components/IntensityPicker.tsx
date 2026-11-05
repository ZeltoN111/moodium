import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';
import { MOTION } from '@/constants/Motion';
import { tap } from '@/utils/haptics';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function Segment({ level, lit, tint, off, onPress, selected }: {
  level: number;
  lit: boolean;
  tint: string;
  off: string;
  selected: boolean;
  onPress: () => void;
}) {
  const on = useSharedValue(lit ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(lit ? 1 : 0, MOTION.fast);
  }, [on, lit]);

  const style = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [off, tint]) }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${level} / 10`}
      style={({ pressed }) => [styles.hit, { opacity: pressed ? 0.7 : 1 }]}>
      <Animated.View style={[styles.bar, style]} />
    </Pressable>
  );
}

type Props = {
  value: number;
  onChange: (intensity: number) => void;
};

/** Ten segments; everything up to the chosen level is lit. Each segment is a full 44 px tap target. */
export default function IntensityPicker({ value, onChange }: Props) {
  const tint = useThemeColor({}, 'tint');
  const off = useThemeColor({}, 'cardAlt');

  return (
    <View style={styles.row}>
      {LEVELS.map((level) => (
        <Segment
          key={level}
          level={level}
          lit={level <= value}
          selected={level === value}
          tint={tint}
          off={off}
          onPress={() => {
            tap();
            onChange(level);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  hit: { flex: 1, height: 44, justifyContent: 'center' },
  bar: { height: 22, borderRadius: 5 },
});
