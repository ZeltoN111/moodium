import { Pressable, StyleSheet, View } from 'react-native';

import Icon from '@/components/Icon';
import RollingNumber from '@/components/RollingNumber';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { tap } from '@/utils/haptics';

type Props = {
  label: string;
  /** Numeric value behind the label; when set, its digits roll on change. */
  value?: number;
  onMinus: () => void;
  onPlus: () => void;
  /** Tapping the value clears it, when provided. */
  onClear?: () => void;
  minusLabel?: string;
  plusLabel?: string;
};

/** A compact "−  value  +" control. */
export default function Stepper({ label, value, onMinus, onPlus, onClear, minusLabel, plusLabel }: Props) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const button = (name: 'minus' | 'plus', onPress: () => void, accessibilityLabel: string) => (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [styles.button, { borderColor: border, opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={name} size={18} color={tint} strokeWidth={2.4} />
    </Pressable>
  );

  return (
    <View style={styles.row}>
      {button('minus', onMinus, minusLabel ?? '−')}
      <Pressable onPress={onClear} disabled={!onClear} style={styles.valueBox}>
        {value === undefined ? (
          <Text style={styles.value}>{label}</Text>
        ) : (
          <RollingNumber value={value} text={label} style={styles.value} />
        )}
      </Pressable>
      {button('plus', onPlus, plusLabel ?? '+')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  button: { flexShrink: 0, width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 8 },
  value: { fontFamily: FONTS.mono, fontSize: 16, lineHeight: 22 },
});
