import { useFocusEffect } from 'expo-router';
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import Aurora from '@/components/Aurora';

import Icon from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { Text, useThemeColor } from '@/components/Themed';
import { FONTS, LABEL } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';

const GAP = 14;
/** Content never grows wider than this, so laptops get a centred board instead of stretched cards. */
export const MAX_CONTENT_WIDTH = 1180;
/** From this window width on, the tab bar is a sidebar instead of the floating dock. */
export const SIDEBAR_BREAKPOINT = 900;
/** Room kept free at the bottom of a phone screen for the floating dock. */
export const DOCK_SPACE = 124;

type GridContext = { width: number; columns: number };
const GridContext = createContext<GridContext>({ width: 0, columns: 1 });

/** 1 column on phones, 2 on tablets / narrow windows, 3 on laptops. */
export function columnsFor(width: number): number {
  if (width < 620) return 1;
  if (width < 960) return 2;
  return 3;
}

export function useIsWide() {
  const { width } = useWindowDimensions();
  return width >= SIDEBAR_BREAKPOINT;
}

/** The instrument-panel backdrop: a fine dot grid that stays put while content scrolls. */
export function DotGrid() {
  const dot = useThemeColor({}, 'dot');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="signal-dots" width={18} height={18} patternUnits="userSpaceOnUse">
            <Circle cx={1} cy={1} r={1} fill={dot} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#signal-dots)" />
      </Svg>
    </View>
  );
}

type ScreenProps = {
  children: ReactNode;
  maxWidth?: number;
  keyboard?: boolean;
  /** In-page header: a small mono line above a large display title. */
  eyebrow?: string;
  title?: ReactNode;
  /** Buttons aligned to the right of the title. */
  actions?: ReactNode;
  /** Set for screens shown under a native header (modals), which already handle the top inset. */
  underHeader?: boolean;
  /** Colour of the ambient glow at the top of the screen; none when omitted. */
  glow?: string;
  glowSecondary?: string;
  /** Shows the Moodium wordmark above the title. */
  brand?: boolean;
};

/** Scrolling page with a centred, width-limited board, the dot-grid backdrop and an optional title. */
export function Screen({
  children,
  maxWidth = MAX_CONTENT_WIDTH,
  keyboard = false,
  eyebrow,
  title,
  actions,
  underHeader = false,
  glow,
  glowSecondary,
  brand = false,
}: ScreenProps) {
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const padding = width < 620 ? 20 : width < 960 ? 28 : 40;
  const wide = width >= SIDEBAR_BREAKPOINT;
  /** Small phones (iPhone SE, 320–359 px) get smaller display type so words never break. */
  const compact = width < 360;
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);

  // A short fade each time the screen comes into focus — no movement, just opacity.
  useFocusEffect(
    useCallback(() => {
      if (reduced) return;
      fade.value = 0;
      fade.value = withTiming(1, MOTION.screen);
    }, [fade, reduced])
  );
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={[styles.flex, { backgroundColor: background }]}>
      <DotGrid />
      {glow ? <Aurora color={glow} secondary={glowSecondary} /> : null}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.screen,
          {
            paddingHorizontal: padding,
            paddingTop: underHeader ? 8 : insets.top + (wide ? 36 : 20),
            paddingBottom: wide ? 56 : DOCK_SPACE + insets.bottom,
          },
        ]}
        keyboardShouldPersistTaps={keyboard ? 'handled' : 'never'}>
        <Animated.View style={[styles.board, { maxWidth }, fadeStyle]}>
          {brand && !wide && (
            <View style={styles.brand}>
              <Icon name="logo" size={22} color={tint} strokeWidth={2} />
              <Text style={[LABEL, styles.wordmark, { color: muted }]}>Moodium</Text>
            </View>
          )}
          {(title || eyebrow || actions) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {eyebrow ? <Text style={[LABEL, { color: muted }]}>{eyebrow}</Text> : null}
                {title ? (
                  typeof title === 'string' ? <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text> : title
                ) : null}
              </View>
              {actions ? <View style={styles.actions}>{actions}</View> : null}
            </View>
          )}
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** Lays tiles out on a column grid; each Tile asks for a span per column count. */
export function BentoGrid({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  const columns = columnsFor(width);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.floor(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  return (
    <GridContext.Provider value={{ width, columns }}>
      <View onLayout={onLayout} style={[styles.grid, style]}>
        {width > 0 ? children : null}
      </View>
    </GridContext.Provider>
  );
}

export function useGrid() {
  return useContext(GridContext);
}

type TileProps = {
  children: ReactNode;
  /** Column span for [1, 2, 3] column layouts, or a single number used for all. */
  span?: number | [number, number, number];
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  /** Content aligned to the right of the title row. */
  accessory?: ReactNode;
  /** Faint brand wash instead of the plain panel. */
  accent?: boolean;
  /** No panel at all: the content sits directly on the dot grid (hero instruments). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Tile({
  children,
  span = 1,
  title,
  subtitle,
  icon,
  iconColor,
  accessory,
  accent,
  bare,
  style,
}: TileProps) {
  const { width, columns } = useGrid();
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  const wanted = typeof span === 'number' ? span : span[columns - 1];
  const used = Math.min(columns, wanted);
  const tileWidth = (width - GAP * (columns - 1)) / columns;
  const pixelWidth = tileWidth * used + GAP * (used - 1);

  return (
    <View
      style={[
        styles.tile,
        bare
          ? styles.bare
          : {
              backgroundColor: accent ? `${tint}12` : card,
              borderColor: accent ? `${tint}44` : border,
            },
        { width: pixelWidth },
        style,
      ]}>
      {(title || accessory) && (
        <View style={styles.tileHeader}>
          <View style={styles.tileTitleRow}>
            {icon ? <Icon name={icon} size={15} color={iconColor ?? muted} /> : null}
            <View style={styles.tileTitles}>
              {title ? <Text style={[LABEL, { color: muted }]}>{title}</Text> : null}
              {subtitle ? <Text style={[styles.tileSubtitle, { color: muted }]}>{subtitle}</Text> : null}
            </View>
          </View>
          {accessory}
        </View>
      )}
      {children}
    </View>
  );
}

/**
 * Tiles stacked vertically inside one grid cell. Give the last tile `style={{ flex: 1 }}` and the
 * stack's bottom edge lines up with its neighbours, so columns of different content still end together.
 */
export function TileStack({ children, span = 1 }: { children: ReactNode; span?: number | [number, number, number] }) {
  const { width, columns } = useGrid();
  const wanted = typeof span === 'number' ? span : span[columns - 1];
  const used = Math.min(columns, wanted);
  const tileWidth = (width - GAP * (columns - 1)) / columns;
  return <View style={{ width: tileWidth * used + GAP * (used - 1), gap: GAP }}>{children}</View>;
}

/** A 44 px square outline button for headers (info, share, previous/next). */
export function IconButton({
  icon,
  onPress,
  label,
  disabled,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  disabled?: boolean;
}) {
  const border = useThemeColor({}, 'border');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: border, opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}>
      <Icon name={icon} size={19} color={disabled ? muted : text} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { alignItems: 'center' },
  board: { width: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  wordmark: { fontSize: 12, letterSpacing: 3.4 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  headerText: { flexShrink: 1, gap: 8 },
  title: { fontFamily: FONTS.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  titleCompact: { fontSize: 24, lineHeight: 30 },
  actions: { flexDirection: 'row', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, width: '100%' },
  tile: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth * 2, padding: 18 },
  bare: { borderWidth: 0, paddingHorizontal: 0, backgroundColor: 'transparent' },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  tileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  tileTitles: { flexShrink: 1, gap: 4 },
  tileSubtitle: { fontSize: 13, lineHeight: 18 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
