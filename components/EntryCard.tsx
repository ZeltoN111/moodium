import { Pressable, StyleSheet, View } from 'react-native';

import { Tile } from '@/components/Bento';
import MoodGlyph from '@/components/MoodGlyph';
import { moodLabel } from '@/components/MoodPicker';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { usePalette } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import type { EntryListItem } from '@/database/queries';
import { formatDayLabel } from '@/utils/date';

type Props = {
  entry: EntryListItem;
  onPress?: () => void;
};

export default function EntryCard({ entry, onPress }: Props) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const { t, locale } = useT();
  const color = usePalette().mood(entry.mood);

  const meta = [
    entry.sleep_hours !== null ? `${t('sectionSleep')} ${t('hoursShort', { hours: entry.sleep_hours })}` : null,
    entry.stress !== null ? `${t('sectionStress')} ${entry.stress}/5` : null,
    entry.workload !== null ? `${t('sectionWorkload')} ${entry.workload}/5` : null,
  ].filter(Boolean);

  return (
    <Tile>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint={t('tapToEdit')}
        style={({ pressed }) => [styles.body, { opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[LABEL, { color: muted }]}>{formatDayLabel(entry.date, locale)}</Text>
            <Text style={[styles.mood, { color }]}>{moodLabel(t, entry.mood)}</Text>
          </View>
          <MoodGlyph mood={entry.mood} />
        </View>

        {entry.note ? <Text style={styles.note}>{entry.note}</Text> : null}

        <View style={styles.footer}>
          <Text style={[styles.meta, { color: muted }]}>{t('intensityValue', { value: entry.intensity })}</Text>
          {meta.map((item) => (
            <Text key={item} style={[styles.meta, { color: muted }]}>
              {item}
            </Text>
          ))}
          {entry.tags.map((tag) => (
            <Text key={tag} style={[styles.meta, { color: tint }]}>
              #{tag}
            </Text>
          ))}
        </View>
      </Pressable>
    </Tile>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 6 },
  mood: { fontFamily: FONTS.displayRegular, fontSize: 18, lineHeight: 24 },
  note: { fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  meta: { fontFamily: FONTS.mono, fontSize: 11 },
});
