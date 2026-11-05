import { StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import { usePalette } from '@/constants/Palette';

/** Tiny five-bar meter that echoes the mood picker: bars up to the mood are lit. */
export default function MoodGlyph({ mood, size = 28 }: { mood: number; size?: number }) {
  const off = useThemeColor({}, 'border');
  const color = usePalette().mood(mood);
  const bar = Math.max(3, Math.round(size / 5));
  return (
    <View style={[styles.row, { height: size, gap: Math.max(2, Math.round(bar / 2)) }]} accessible={false}>
      {[1, 2, 3, 4, 5].map((level) => (
        <View
          key={level}
          style={{
            width: bar,
            height: size * (0.3 + level * 0.14),
            borderRadius: 2,
            backgroundColor: level <= mood ? color : off,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
