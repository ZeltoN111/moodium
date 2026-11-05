import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ColorValue } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsWide } from '@/components/Bento';
import Icon from '@/components/Icon';
import Sidebar from '@/components/Sidebar';
import type { IconName } from '@/components/Icon';
import Colors from '@/constants/Colors';
import { FONTS } from '@/constants/Fonts';
import { MOTION } from '@/constants/Motion';
import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import { useT } from '@/context/Settings';
import { tap } from '@/utils/haptics';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, IconName> = {
  index: 'pen',
  history: 'calendar',
  insights: 'chart',
  settings: 'sliders',
};

const tabIcon = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={22} color={String(color)} strokeWidth={1.8} />;
  };

type ItemProps = {
  focused: boolean;
  label: string;
  icon: IconName;
  colors: (typeof Colors)['dark'];
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A dock item: the active one widens into a lit pill with its label; the change is a short glide. */
function DockItem({ focused, label, icon, colors, onPress }: ItemProps) {
  const on = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, MOTION.base);
  }, [on, focused]);

  const grow = useAnimatedStyle(() => ({ flexGrow: 1 + 1.05 * on.value }));
  const pill = useAnimatedStyle(() => ({ opacity: on.value }));
  const color = focused ? colors.onTint : colors.tabIconDefault;
  // On the narrowest phones the active tab shows only its icon, so labels never get clipped.
  const { width } = useWindowDimensions();
  const showLabel = focused && width >= 360;

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.item, grow]}>
      {({ pressed }) => (
        <>
          <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: colors.tint }, pill]} />
          <View style={[styles.content, { opacity: pressed ? 0.7 : 1 }]}>
            <Icon name={icon} size={focused ? 19 : 22} color={color} strokeWidth={1.8} />
            {showLabel && (
              <Text numberOfLines={1} style={[styles.label, { color }]}>
                {label}
              </Text>
            )}
          </View>
        </>
      )}
    </AnimatedPressable>
  );
}

/** Floating glass dock: the active tab is a lit pill with its label, the others are icons. */
function Dock({ state, descriptors, navigation }: TabBarProps) {
  const colors = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.dockWrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={[styles.dock, { backgroundColor: colors.dock, borderColor: colors.border }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label = typeof options.title === 'string' ? options.title : route.name;
          return (
            <DockItem
              key={route.key}
              focused={focused}
              label={label}
              icon={ICONS[route.name] ?? 'sparkles'}
              colors={colors}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  tap();
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Wide screens: the same tabs as a navigation rail with a live summary panel. */
function Rail({ state, descriptors, navigation }: TabBarProps) {
  const routes = state.routes.map((route) => {
    const title = descriptors[route.key].options.title;
    return { key: route.key, name: route.name, title: typeof title === 'string' ? title : route.name, icon: ICONS[route.name] ?? 'sparkles' };
  });
  return (
    <Sidebar
      routes={routes}
      activeIndex={state.index}
      onNavigate={(route, index) => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (state.index !== index && !event.defaultPrevented) {
          tap();
          navigation.navigate(route.name);
        }
      }}
    />
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { t } = useT();
  const sidebar = useIsWide();

  return (
    <Tabs
      tabBar={(props) => (sidebar ? <Rail {...props} /> : <Dock {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarLabelStyle: { fontFamily: FONTS.bodyMedium, fontSize: 13 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabToday'), tabBarIcon: tabIcon('pen') }} />
      <Tabs.Screen name="history" options={{ title: t('tabHistory'), tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="insights" options={{ title: t('tabInsights'), tabBarIcon: tabIcon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabSettings'), tabBarIcon: tabIcon('sliders') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dockWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  dock: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    maxWidth: 440,
    height: 68,
    padding: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  item: {
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 17,
    overflow: 'hidden',
  },
  pill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 17 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 1, minWidth: 0 },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 13, flexShrink: 1 },
});
