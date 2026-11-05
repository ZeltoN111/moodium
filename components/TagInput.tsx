import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { useT } from '@/context/Settings';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function TagInput({ tags, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const { t } = useT();

  function addTag() {
    const name = draft.trim().toLowerCase();
    if (name && !tags.includes(name)) {
      onChange([...tags, name]);
    }
    setDraft('');
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTag}
          placeholder={t('tagPlaceholder')}
          placeholderTextColor={muted}
          autoCapitalize="none"
          returnKeyType="done"
          blurOnSubmit={false}
          style={[styles.input, { borderColor: border, color: text }]}
        />
        <Pressable
          onPress={addTag}
          disabled={!draft.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('add')}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: tintSoft, opacity: !draft.trim() ? 0.4 : pressed ? 0.6 : 1 },
          ]}>
          <Text style={[styles.addLabel, { color: tint }]}>{t('add')}</Text>
        </Pressable>
      </View>
      {tags.length > 0 && (
        <View style={styles.chips}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onChange(tags.filter((item) => item !== tag))}
              accessibilityRole="button"
              accessibilityLabel={`${t('delete')} #${tag}`}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: tintSoft, opacity: pressed ? 0.6 : 1 },
              ]}>
              <Text style={[styles.chipLabel, { color: tint }]}>#{tag}</Text>
              <Icon name="x" size={14} color={tint} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: FONTS.body,
  },
  addButton: {
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  addLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chipLabel: {
    fontFamily: FONTS.mono,
    fontSize: 13,
  },
});
