import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';

export type OtpState = 'idle' | 'error' | 'ok';

type Props = {
  value: string;
  onChange: (value: string) => void;
  length: number;
  state?: OtpState;
  disabled?: boolean;
  autoFocus?: boolean;
  label: string;
};

/**
 * One box per digit. A single invisible input sits on top and does the real work, so typing,
 * backspace, pasting the whole code and one-time-code autofill all behave like a normal field.
 */
export default function OtpInput({ value, onChange, length, state = 'idle', disabled, autoFocus, label }: Props) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const shake = useSharedValue(0);
  const pulse = useSharedValue(1);

  // Wrong code: a short side-to-side shake. Right code: a small pulse.
  useEffect(() => {
    if (reduced) return;
    if (state === 'error') {
      shake.value = withSequence(
        withTiming(-9, { duration: 60 }),
        withRepeat(withTiming(9, { duration: 100 }), 5, true),
        withTiming(0, { duration: 60 })
      );
    } else if (state === 'ok') {
      pulse.value = withSequence(withTiming(1.04, MOTION.fast), withTiming(1, MOTION.base));
    }
  }, [state, reduced, shake, pulse]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pulse.value }],
  }));

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View>
      <Animated.View style={[styles.row, rowStyle]}>
        {Array.from({ length }, (_, index) => (
          <Digit
            key={index}
            char={value[index] ?? ''}
            active={focused && !disabled && index === activeIndex}
            state={state}
          />
        ))}
      </Animated.View>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={length}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        autoCapitalize="none"
        autoCorrect={false}
        caretHidden
        accessibilityLabel={label}
        // Invisible but on top of the boxes, so tapping anywhere on them focuses the field.
        style={styles.hidden}
      />
    </View>
  );
}

function Digit({ char, active, state }: { char: string; active: boolean; state: OtpState }) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const border = useThemeColor({}, 'border');
  const danger = useThemeColor({}, 'danger');
  const text = useThemeColor({}, 'text');
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const caret = useSharedValue(0);

  // A digit lands with a quick pop.
  useEffect(() => {
    if (!char || reduced) return;
    pop.value = 0.86;
    pop.value = withTiming(1, MOTION.fast);
  }, [char, reduced, pop]);

  // The active empty box shows a blinking caret.
  useEffect(() => {
    if (active && !char) {
      caret.value = 1;
      caret.value = withRepeat(withSequence(withTiming(0, { duration: 480 }), withTiming(1, { duration: 480 })), -1);
    } else {
      cancelAnimation(caret);
      caret.value = 0;
    }
  }, [active, char, caret]);

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const borderColor =
    state === 'error' ? danger : state === 'ok' ? tint : active ? tint : char ? `${tint}88` : border;
  const backgroundColor = state === 'ok' || char ? tintSoft : 'transparent';

  return (
    <Animated.View
      style={[
        styles.box,
        { borderColor, backgroundColor, borderWidth: active || state !== 'idle' ? 2 : 1 },
        boxStyle,
      ]}>
      <Text style={[styles.digit, { color: state === 'error' ? danger : text }]}>{char}</Text>
      <Animated.View style={[styles.caret, { backgroundColor: tint }, caretStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: {
    flex: 1,
    minWidth: 0,
    maxWidth: 58,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontFamily: FONTS.mono, fontSize: 22, lineHeight: 28 },
  caret: { position: 'absolute', width: 2, height: 26, borderRadius: 1 },
  hidden: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
});
