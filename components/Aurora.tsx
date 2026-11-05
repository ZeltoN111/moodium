import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useColorScheme } from '@/components/useColorScheme';

function Orb({ id, color, size, opacity }: { id: string; color: string; size: number; opacity: number }) {
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

type Props = {
  /** Main glow colour — follows the screen's state (today's mood, the risk level…). */
  color: string;
  /** Second, smaller glow on the right; defaults to the main colour. */
  secondary?: string;
};

/** Static ambient light behind a screen: two soft radial glows at the top. */
export default function Aurora({ color, secondary }: Props) {
  const { width } = useWindowDimensions();
  const dark = useColorScheme() === 'dark';
  const size = Math.min(Math.max(width, 420), 900) * 1.15;
  const small = size * 0.7;
  const strength = dark ? 0.24 : 0.08;
  const second = secondary ?? color;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, { transform: [{ translateX: -size * 0.25 }, { translateY: -size * 0.54 }] }]}>
        <Orb id={`aurora-main-${color.replace('#', '')}`} color={color} size={size} opacity={strength} />
      </View>
      <View style={[styles.orb, { transform: [{ translateX: width - small * 0.65 }, { translateY: -small * 0.32 }] }]}>
        <Orb id={`aurora-second-${second.replace('#', '')}`} color={second} size={small} opacity={strength * 0.7} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', left: 0, top: 0 },
});
