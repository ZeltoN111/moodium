import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';
import { MOTION } from '@/constants/Motion';
import { rollDirection, slotsOf } from '@/utils/roll';

type DigitProps = {
  char: string;
  direction: 1 | -1 | 0;
  height: number;
  style: StyleProp<TextStyle>;
};

/** One character slot: when it changes, the old character slides out and the new one slides in. */
function RollDigit({ char, direction, height, style }: DigitProps) {
  const [shown, setShown] = useState(char);
  const [leaving, setLeaving] = useState<string | null>(null);
  const progress = useSharedValue(1);
  const dir = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (char === shown) return;
    if (reduced || direction === 0) {
      setShown(char);
      setLeaving(null);
      return;
    }
    setLeaving(shown);
    setShown(char);
    dir.value = direction;
    progress.value = 0;
    progress.value = withTiming(1, MOTION.base);
    // Only a new character should start a roll; the other values are read at that moment.
  }, [char]);

  // Rolling up: the new digit comes from below and the old one leaves upwards; down is the mirror.
  const incoming = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: dir.value * height * 0.9 * (1 - progress.value) }],
  }));
  const outgoing = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: -dir.value * height * 0.9 * progress.value }],
  }));

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.Text style={[style, incoming]}>{shown}</Animated.Text>
      {leaving !== null && (
        <Animated.Text style={[style, styles.leaving, outgoing]} accessibilityElementsHidden>
          {leaving}
        </Animated.Text>
      )}
    </View>
  );
}

type Props = {
  /** Numeric value, used to decide whether digits roll up or down. */
  value: number | null;
  /** The text to show (already formatted: "4,5", "09 / 10"…). */
  text: string;
  style: StyleProp<TextStyle>;
  /** Visible height of one line; defaults to the style's lineHeight. */
  height?: number;
};

/** A number whose changed digits roll up when it grows and down when it shrinks. */
export default function RollingNumber({ value, text, style, height }: Props) {
  const color = useThemeColor({}, 'text');
  const previous = useRef<number | null>(value);
  const direction = rollDirection(previous.current, value);
  const flat = StyleSheet.flatten(style) ?? {};
  const line = height ?? flat.lineHeight ?? Math.round((flat.fontSize ?? 16) * 1.25);

  useEffect(() => {
    previous.current = value;
  }, [value]);

  const textStyle = [{ color, fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] }, style, { lineHeight: line }];

  return (
    <View style={styles.row} accessible accessibilityLabel={text}>
      {slotsOf(text).map((slot) =>
        slot.digit ? (
          <RollDigit key={slot.key} char={slot.char} direction={direction} height={line} style={textStyle} />
        ) : (
          <Animated.Text key={slot.key} style={textStyle}>
            {slot.char}
          </Animated.Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  leaving: { position: 'absolute', left: 0, top: 0 },
});
