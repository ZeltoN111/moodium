import { Pressable, StyleSheet, View } from 'react-native';

import Icon from '@/components/Icon';
import RollingNumber from '@/components/RollingNumber';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { tap } from '@/utils/haptics';

const MINUTE_STEP = 5;
const PRESETS: [number, number][] = [
  [8, 0],
  [12, 0],
  [18, 0],
  [21, 0],
];

const pad = (value: number) => String(value).padStart(2, '0');

type Props = {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  hoursLabel: string;
  minutesLabel: string;
};

/** A clock face: big HH : MM with an arrow above and below each part, plus one-tap common times. */
export default function TimePicker({ hour, minute, onChange, hoursLabel, minutesLabel }: Props) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  const arrow = (direction: 'up' | 'down', onPress: () => void, label: string) => (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.arrow, { opacity: pressed ? 0.5 : 1 }]}>
      <Icon name={direction === 'up' ? 'chevron-up' : 'chevron-down'} size={22} color={tint} strokeWidth={2.2} />
    </Pressable>
  );

  const column = (value: number, up: () => void, down: () => void, label: string) => (
    <View style={styles.column}>
      {arrow('up', up, `${label} +`)}
      <View style={[styles.face, { borderColor: border, backgroundColor: tintSoft }]}>
        <RollingNumber value={value} text={pad(value)} style={[styles.digits, { color: tint }]} height={52} />
      </View>
      {arrow('down', down, `${label} −`)}
    </View>
  );

  return (
    <View>
      <View style={styles.clock}>
        {column(hour, () => onChange((hour + 1) % 24, minute), () => onChange((hour + 23) % 24, minute), hoursLabel)}
        <Text style={[styles.colon, { color: muted }]}>:</Text>
        {column(
          minute,
          () => onChange(hour, (minute + MINUTE_STEP) % 60),
          () => onChange(hour, (minute + 60 - MINUTE_STEP) % 60),
          minutesLabel
        )}
      </View>
      <View style={styles.presets}>
        {PRESETS.map(([h, m]) => {
          const selected = h === hour && m === minute;
          return (
            <Pressable
              key={`${h}:${m}`}
              onPress={() => {
                tap();
                onChange(h, m);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.preset,
                { borderColor: selected ? tint : border, backgroundColor: selected ? tintSoft : 'transparent', opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[styles.presetLabel, { color: selected ? tint : muted }]}>
                {pad(h)}:{pad(m)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  column: { alignItems: 'center' },
  arrow: { width: 56, height: 36, alignItems: 'center', justifyContent: 'center' },
  face: {
    width: 92,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  digits: { fontFamily: FONTS.mono, fontSize: 40, lineHeight: 52 },
  colon: { fontFamily: FONTS.mono, fontSize: 36, lineHeight: 44, marginTop: -4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  preset: { paddingHorizontal: 14, height: 34, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  presetLabel: { fontFamily: FONTS.mono, fontSize: 13 },
});
