import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";
import { Platform } from "react-native";
import "react-native-reanimated";

import AppLock from "@/components/AppLock";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { FONT_FILES, FONTS } from "@/constants/Fonts";
import { SettingsProvider, useT } from "@/context/Settings";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/database/schema";
import { installWebAlert } from "@/services/webAlert";

export const unstable_settings = {
  // Ensure that reloading on `/about` keeps a back button present.
  initialRouteName: "(tabs)",
};

// react-native-svg forwards touch handlers and native-only attributes (collapsable) to DOM nodes on web;
// React logs a dev-only warning for each one. They are harmless, so keep them out of the overlay.
if (Platform.OS === "web") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (/Unknown event handler property|Invalid DOM property|for a non-boolean attribute/.test(message)) return;
    originalError(...args);
  };
}

installWebAlert();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FONT_FILES,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </SQLiteProvider>
  );
}

/** Lives inside SettingsProvider so the navigation theme follows the user's theme choice. */
function ThemedApp() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={theme}>
      <AppLock>
        <AppStack />
      </AppLock>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
    </ThemeProvider>
  );
}

function AppStack() {
  const { t } = useT();
  const colors = Colors[useColorScheme()];

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: FONTS.displayRegular, fontSize: 16 },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ presentation: "modal", title: t("aboutTitle") }} />
    </Stack>
  );
}
