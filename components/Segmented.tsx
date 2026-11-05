import { Pressable, StyleSheet, View } from 'react-native';

import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { tap } from '@/utils/haptics';

type Option<T extends string> = { value: T; label: string; icon?: IconName };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

/** Pill-style segmented control that stretches to the width of its tile. */
export default function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'onTint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.track, { borderColor: border }]}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? onTint : muted;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              tap();
              onChange(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: tint }]}>
            {option.icon ? <Icon name={option.icon} size={16} color={color} /> : null}
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 18, borderWidth: 1, padding: 4, gap: 4 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 14,
  },
  label: { fontSize: 13, fontWeight: '500' },
});
