import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { usePalette, zoneColor } from '@/constants/Palette';
import { useT } from '@/context/Settings';
import type { RiskLevel } from '@/utils/burnout';

const SIZE = 300;
const CENTER = SIZE / 2;
const OUTER = CENTER - 4;
const TICKS = 54;
/** The scale sweeps 270°, leaving the bottom open like an instrument dial. */
const SWEEP = 270;
const DURATION = 1100;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Animates 0 → target with an ease-out curve; plain JS so it behaves the same on every platform. */
function useAnimatedProgress(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      setValue(target * easeOut(t));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}

const TICK_GEOMETRY = Array.from({ length: TICKS }, (_, index) => {
  const value = (index / (TICKS - 1)) * 100;
  const angle = ((-SWEEP / 2 + (SWEEP * index) / (TICKS - 1)) * Math.PI) / 180;
  const major = index % 9 === 0;
  const inner = OUTER - (major ? 26 : 18);
  return {
    value,
    x1: CENTER + Math.sin(angle) * inner,
    y1: CENTER - Math.cos(angle) * inner,
    x2: CENTER + Math.sin(angle) * OUTER,
    y2: CENTER - Math.cos(angle) * OUTER,
  };
});

type Props = {
  score: number;
  level: RiskLevel;
  label: string;
};

/** Dial of 54 ticks that light up to the index, each in the colour of its risk zone. */
export default function BurnoutGauge({ score, level, label }: Props) {
  const off = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const palette = usePalette();
  const { t } = useT();
  const progress = useAnimatedProgress(score);
  const color = palette.risk[level];
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    spin.value = withRepeat(withTiming(1, { duration: 28000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(spin);
    };
  }, [spin, reduced]);

  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const counterRing = useAnimatedStyle(() => ({ transform: [{ rotate: `${-spin.value * 240}deg` }] }));
  const lead = TICK_GEOMETRY.reduce((found, tick, index) => (tick.value <= progress ? index : found), -1);

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${label}: ${score} / 100`}>
      <View style={styles.dial}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <RadialGradient id={`gauge-core-${level}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                <Stop offset="1" stopColor={color} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={CENTER} cy={CENTER} r={OUTER - 40} fill={`url(#gauge-core-${level})`} />
          </Svg>
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ring]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={CENTER} cy={CENTER} r={OUTER - 44} stroke={off} strokeWidth={1} strokeDasharray="3 6" fill="none" />
            <Circle cx={CENTER} cy={CENTER} r={OUTER - 44} stroke={color} strokeOpacity={0.7} strokeWidth={2} strokeDasharray="22 640" strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, counterRing]}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={CENTER} cy={CENTER} r={OUTER - 54} stroke={off} strokeWidth={1} strokeDasharray="1 10" fill="none" />
          </Svg>
        </Animated.View>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          {TICK_GEOMETRY.map((tick, index) => {
            const lit = tick.value <= progress;
            const tickColor = zoneColor(palette, tick.value);
            return (
              <Line
                key={index}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={lit ? tickColor : off}
                strokeWidth={index === lead ? 4.5 : 3}
                strokeLinecap="round"
              />
            );
          })}
          {lead >= 0 && (
            <Line
              x1={TICK_GEOMETRY[lead].x1}
              y1={TICK_GEOMETRY[lead].y1}
              x2={TICK_GEOMETRY[lead].x2}
              y2={TICK_GEOMETRY[lead].y2}
              stroke={zoneColor(palette, TICK_GEOMETRY[lead].value)}
              strokeOpacity={0.35}
              strokeWidth={11}
              strokeLinecap="round"
            />
          )}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[LABEL, { color: muted, letterSpacing: 2.4 }]}>{t('indexLabel')}</Text>
          <Text style={[styles.score, { color }]}>{Math.round(progress)}</Text>
          <Text style={[styles.outOf, { color: muted }]}>/ 100</Text>
        </View>
        <Text style={[styles.end, styles.endLeft, { color: muted }]}>0</Text>
        <Text style={[styles.end, styles.endRight, { color: muted }]}>100</Text>
      </View>

      <View style={[styles.pill, { borderColor: `${color}66`, backgroundColor: `${color}18` }]}>
        <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>

      <View style={styles.zones}>
        {(
          [
            ['low', 35, '< 35'],
            ['moderate', 25, '35–59'],
            ['high', 40, '≥ 60'],
          ] as const
        ).map(([zone, flex, range]) => (
          <View key={zone} style={[styles.zone, { flex }]}>
            <View style={[styles.zoneBar, { backgroundColor: palette.risk[zone], opacity: zone === level ? 1 : 0.4 }]} />
            <Text style={[styles.zoneLabel, { color: palette.risk[zone], textAlign: zone === 'high' ? 'right' : 'left' }]}>
              {range}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 18, width: '100%' },
  dial: { width: SIZE, height: SIZE },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 4 },
  score: { fontFamily: FONTS.display, fontSize: 88, lineHeight: 96, letterSpacing: -3 },
  outOf: { fontFamily: FONTS.mono, fontSize: 12 },
  end: { position: 'absolute', bottom: 30, fontFamily: FONTS.mono, fontSize: 10 },
  endLeft: { left: 44 },
  endRight: { right: 36 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  label: { fontSize: 14, fontWeight: '600' },
  zones: { flexDirection: 'row', gap: 4, width: '100%', maxWidth: 360 },
  zone: { gap: 6 },
  zoneBar: { height: 3, borderRadius: 2 },
  zoneLabel: { fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1 },
});
