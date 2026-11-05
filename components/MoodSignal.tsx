import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import { LABEL } from '@/constants/Fonts';
import { useT } from '@/context/Settings';
import { moodPoints, polylineLength, smoothPath } from '@/utils/path';
import type { Point } from '@/utils/path';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HEIGHT = 80;

/** A data point that appears once the trace has been drawn past it. */
function TraceDot({ point, at, progress, color, fill }: { point: Point; at: number; progress: SharedValue<number>; color: string; fill: string }) {
  const props = useAnimatedProps(() => {
    const shown = Math.min(1, Math.max(0, (progress.value - at) * 12));
    return { opacity: shown, r: 2.5 * shown };
  });
  return <AnimatedCircle cx={point.x} cy={point.y} fill={fill} stroke={color} strokeWidth={1.5} animatedProps={props} />;
}

type Props = {
  /** Oldest → newest, one value per day; null where nothing was logged. */
  values: (number | null)[];
};

/** The last two weeks of mood as an oscilloscope trace that draws itself; each day appears as the pen passes it. */
export default function MoodSignal({ values }: Props) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const reduced = useReducedMotion();
  const { t } = useT();
  const [width, setWidth] = useState(0);

  const progress = useSharedValue(0);

  const points = width > 0 ? moodPoints(values, width - 12, HEIGHT).map((p) => ({ x: p.x + 6, y: p.y })) : [];
  const d = smoothPath(points);
  const length = Math.max(1, polylineLength(points) * 1.08);
  const last = points[points.length - 1];
  const signature = values.join(',');

  useEffect(() => {
    if (!width) return;
    progress.value = 0;
    progress.value = reduced ? 1 : withTiming(1, { duration: 1700, easing: Easing.bezier(0.22, 0.8, 0.2, 1) });
  }, [width, signature, progress, reduced]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={[LABEL, { color: muted }]}>{t('signalTrace')}</Text>
      </View>
      <View
        style={[styles.field, { borderColor: border }]}
        onLayout={(event) => setWidth(Math.floor(event.nativeEvent.layout.width))}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Line x1={0} y1={HEIGHT / 2} x2={width} y2={HEIGHT / 2} stroke={border} strokeDasharray="2 5" />
            {points.length >= 2 && (
              <AnimatedPath
                d={d}
                stroke={tint}
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${length} ${length}`}
                animatedProps={lineProps}
              />
            )}
            {points.slice(0, -1).map((point, index) => (
              <TraceDot
                key={`${index}-${point.x}`}
                point={point}
                at={point.x / width}
                progress={progress}
                color={tint}
                fill={background}
              />
            ))}
            {last && <Circle cx={last.x} cy={last.y} r={4.5} fill={background} stroke={tint} strokeWidth={2.2} />}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  field: {
    height: HEIGHT + 12,
    paddingTop: 6,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
});
