import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import Icon from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { withAlpha } from '@/constants/color';
import { factorIcon } from '@/constants/Factors';
import { MOTION } from '@/constants/Motion';
import { useT } from '@/context/Settings';
import type { Factor } from '@/database/types';
import type { TKey } from '@/i18n';
import { tap } from '@/utils/haptics';

function Chip({ factor, selected, onPress }: { factor: Factor; selected: boolean; onPress: () => void }) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const { t } = useT();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, MOTION.base);
  }, [on, selected]);

  const clear = withAlpha(tint, 0);
  const wash = withAlpha(tint, 0.16);
  const line = withAlpha(border, 1);
  const lit = withAlpha(tint, 1);
  const style = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [clear, wash]),
    borderColor: interpolateColor(on.value, [0, 1], [line, lit]),
  }));

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Animated.View style={[styles.chip, style]}>
        <Icon name={factorIcon(factor.key)} size={18} color={selected ? tint : muted} />
        <Text style={[styles.label, { color: selected ? text : muted }]}>{t(`factor_${factor.key}` as TKey)}</Text>
      </Animated.View>
    </Pressable>
  );
}

type Props = {
  factors: Factor[];
  selectedIds: number[];
  onToggle: (factorId: number) => void;
};

export default function FactorPicker({ factors, selectedIds, onToggle }: Props) {
  return (
    <View style={styles.wrap}>
      {factors.map((factor) => (
        <Chip key={factor.id} factor={factor} selected={selectedIds.includes(factor.id)} onPress={() => onToggle(factor.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  label: { fontSize: 14, fontWeight: '500' },
});
