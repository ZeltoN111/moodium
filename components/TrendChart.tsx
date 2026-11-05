import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import { FONTS } from '@/constants/Fonts';
import { tap } from '@/utils/haptics';
import { areaPath, nearestIndex, polylineLength, scalePoints, smoothPath } from '@/utils/path';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  /** Oldest → newest; null where there is no value. */
  values: (number | null)[];
  min: number;
  max: number;
  /** Gridline values, top to bottom, also printed on the left axis. */
  levels: number[];
  color?: string;
  height?: number;
  /** Optional labels under the x-axis (same length as values; empty strings are skipped). */
  xLabels?: string[];
  /** Full label for each point, shown in the read-out while the chart is touched. */
  pointLabels?: string[];
  formatValue?: (value: number) => string;
  gradientId: string;
};

/**
 * Smooth line with a soft area under it. It draws itself in, and while a finger (or the mouse)
 * moves across it a cursor snaps to the nearest day and reads out its value.
 */
export default function TrendChart({
  values,
  min,
  max,
  levels,
  color,
  height = 160,
  xLabels,
  pointLabels,
  formatValue = (value) => String(Math.round(value)),
  gradientId,
}: Props) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const reduced = useReducedMotion();
  const stroke = color ?? tint;
  const [width, setWidth] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const plot = useRef<View>(null);
  /** Plot's left edge in window coordinates; locationX is unreliable over SVG children on web. */
  const left = useRef(0);
  const measure = () => plot.current?.measureInWindow((x) => (left.current = x));
  const progress = useSharedValue(0);

  const pad = 8;
  const edge = 7;
  const inner = Math.max(0, width - edge * 2);
  const slots = scalePoints(values.map((v) => v ?? min), inner, height, min, max, pad).map((p) => ({ x: p.x + edge, y: p.y }));
  const points = width > 0 ? scalePoints(values, inner, height, min, max, pad).map((p) => ({ x: p.x + edge, y: p.y })) : [];
  const length = Math.max(1, polylineLength(points) * 1.08);
  const last = points[points.length - 1];
  const signature = values.join(',');

  useEffect(() => {
    if (!width) return;
    progress.value = 0;
    progress.value = reduced ? 1 : withTiming(1, { duration: 1600, easing: Easing.bezier(0.22, 0.8, 0.2, 1) });
  }, [width, signature, progress, reduced]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  const areaProps = useAnimatedProps(() => ({ opacity: Math.max(0, (progress.value - 0.35) / 0.65) }));

  const levelY = (level: number) => pad + ((max - level) * (height - 2 * pad)) / (max - min || 1);

  function trackAt(pageX: number) {
    const index = nearestIndex(pageX - left.current - edge, inner, values.length);
    if (values[index] === null) return;
    if (index !== cursor) {
      tap();
      setCursor(index);
    }
  }

  const track = (event: GestureResponderEvent) => trackAt(event.nativeEvent.pageX);
  // On web the cursor also follows the mouse without a click.
  const hover =
    Platform.OS === 'web'
      ? {
          onPointerEnter: measure,
          onPointerMove: (event: { nativeEvent: { clientX: number } }) => trackAt(event.nativeEvent.clientX),
          onPointerLeave: () => setCursor(null),
        }
      : {};

  const active = cursor !== null && values[cursor] !== null ? cursor : null;
  const activePoint = active !== null ? slots[active] : null;
  const bubbleLeft = activePoint ? Math.min(Math.max(activePoint.x - 70, 0), Math.max(0, width - 140)) : 0;

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.axis, { height }]}>
          {levels.map((level) => (
            <Text key={level} style={[styles.axisLabel, { color: muted, top: levelY(level) - 7 }]}>
              {level}
            </Text>
          ))}
        </View>
        <View
          ref={plot}
          style={styles.plot}
          onLayout={(event) => {
            setWidth(Math.floor(event.nativeEvent.layout.width));
            measure();
          }}
          {...hover}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => true}
          onResponderGrant={(event) => {
            measure();
            track(event);
          }}
          onResponderMove={track}
          onResponderRelease={() => setCursor(null)}
          onResponderTerminate={() => setCursor(null)}>
          {width > 0 && (
            <Svg width={width} height={height} pointerEvents="none">
              <Defs>
                <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={stroke} stopOpacity={0.32} />
                  <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {levels.map((level) => (
                <Line key={level} x1={0} x2={width} y1={levelY(level)} y2={levelY(level)} stroke={border} strokeDasharray="2 5" />
              ))}
              {points.length >= 2 && (
                <AnimatedPath d={areaPath(points, height)} fill={`url(#${gradientId})`} animatedProps={areaProps} />
              )}
              {points.length >= 2 && (
                <AnimatedPath
                  d={smoothPath(points)}
                  stroke={stroke}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${length} ${length}`}
                  animatedProps={lineProps}
                />
              )}
              {activePoint && (
                <>
                  <Line x1={activePoint.x} x2={activePoint.x} y1={0} y2={height} stroke={stroke} strokeOpacity={0.5} strokeDasharray="3 4" />
                  <Circle cx={activePoint.x} cy={activePoint.y} r={9} fill={stroke} opacity={0.2} />
                </>
              )}
              {(activePoint ?? last) && (
                <Circle
                  cx={(activePoint ?? last)!.x}
                  cy={(activePoint ?? last)!.y}
                  r={4.5}
                  fill={background}
                  stroke={stroke}
                  strokeWidth={2.2}
                />
              )}
            </Svg>
          )}
          {active !== null && (
            <View
              pointerEvents="none"
              style={[styles.bubble, { left: bubbleLeft, backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.bubbleValue, { color: text }]}>{formatValue(values[active] as number)}</Text>
              {pointLabels?.[active] ? (
                <Text style={[styles.bubbleLabel, { color: muted }]} numberOfLines={1}>
                  {pointLabels[active]}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
      {xLabels && (
        <View style={styles.xRow}>
          {xLabels.map((label, index) => (
            <Text key={index} style={[styles.xLabel, { color: muted }]}>
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  axis: { width: 22 },
  axisLabel: { position: 'absolute', right: 0, fontFamily: FONTS.mono, fontSize: 10 },
  plot: { flex: 1 },
  bubble: {
    position: 'absolute',
    top: -6,
    width: 140,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  bubbleValue: { fontFamily: FONTS.displayRegular, fontSize: 16, lineHeight: 20 },
  bubbleLabel: { fontFamily: FONTS.mono, fontSize: 10 },
  xRow: { flexDirection: 'row', justifyContent: 'space-between', marginLeft: 32 + 4, marginRight: 4, marginTop: 6 },
  xLabel: { fontFamily: FONTS.mono, fontSize: 10 },
});
