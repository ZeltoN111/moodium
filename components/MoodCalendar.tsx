import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import { dayKeyOf, firstWeekdayOffset, monthRange, todayKey } from '@/utils/date';

/** Fades a day tile between full and dimmed, so filtering by mood is a smooth cross-fade. */
function Fade({ dimmed, children }: { dimmed: boolean; children: ReactNode }) {
  const opacity = useSharedValue(dimmed ? 0.14 : 1);

  useEffect(() => {
    opacity.value = withTiming(dimmed ? 0.14 : 1, MOTION.base);
  }, [opacity, dimmed]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.fade, style]}>{children}</Animated.View>;
}

type Props = {
  year: number;
  /** 0-indexed, matching Date. */
  month: number;
  moodByDay: Record<string, number>;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
  /** When set, days with other moods fade out and matching days glow. */
  highlightMood?: number | null;
};

/** Month heat map: each logged day is a tile filled with its mood colour. */
export default function MoodCalendar({ year, month, moodByDay, selectedDay, onSelectDay, highlightMood = null }: Props) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const palette = usePalette();
  const { t } = useT();
  const weekdays = t('weekdays').split(',');
  const today = todayKey();

  const { lastDay } = monthRange(year, month);
  const offset = firstWeekdayOffset(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: lastDay }, (_, index) => index + 1),
  ];

  return (
    <View>
      <View style={styles.grid}>
        {weekdays.map((weekday) => (
          <Text key={weekday} style={[LABEL, styles.weekday, { color: muted }]}>
            {weekday}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }

          const dayKey = dayKeyOf(year, month, day);
          const mood = moodByDay[dayKey];
          const selected = dayKey === selectedDay;
          const isToday = dayKey === today;
          const future = dayKey > today;
          const dimmed = highlightMood !== null && mood !== undefined && mood !== highlightMood;
          const color = mood ? palette.moodFill(mood) : undefined;

          return (
            <Pressable
              key={dayKey}
              onPress={() => onSelectDay(dayKey)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={mood ? `${dayKey}, ${mood}/5` : dayKey}
              style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.6 : 1 }]}>
              <Fade dimmed={dimmed}>
                <View
                  style={[
                    styles.dayCell,
                    color
                      ? { backgroundColor: color, borderColor: color }
                      : { borderColor: border, borderStyle: future ? 'dashed' : 'solid' },
                    (selected || isToday) && { borderColor: selected ? tint : text, borderWidth: 2 },
                  ]}>
                  <Text style={[styles.dayLabel, { color: mood ? palette.onMoodFill(mood) : future ? `${muted}88` : muted }]}>
                    {day}
                  </Text>
                </View>
              </Fade>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  fade: { flex: 1 },
  dayCell: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 6 },
  dayLabel: { fontFamily: FONTS.mono, fontSize: 11 },
});
