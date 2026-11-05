import { useSQLiteContext } from 'expo-sqlite';
import { Appearance } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { getAllSettings, setSetting } from '@/database/queries';
import {
  LOCALES,
  createTranslator,
  resolveLanguage,
} from '@/i18n';
import type { Language, LanguageSetting, Translate } from '@/i18n';

export type ThemeSetting = 'auto' | 'light' | 'dark';

export type Settings = {
  language: LanguageSetting;
  theme: ThemeSetting;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  alertsEnabled: boolean;
  lockEnabled: boolean;
  /** Day key of the last burnout alert, so we notify at most once a day. */
  lastAlertDate: string;
};

const DEFAULTS: Settings = {
  language: 'auto',
  theme: 'auto',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  alertsEnabled: false,
  lockEnabled: false,
  lastAlertDate: '',
};

function parse(raw: Record<string, string>): Settings {
  const language = raw.language;
  return {
    language: language === 'uk' || language === 'en' ? language : 'auto',
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'auto',
    reminderEnabled: raw.reminderEnabled === '1',
    reminderHour: Number(raw.reminderHour ?? DEFAULTS.reminderHour),
    reminderMinute: Number(raw.reminderMinute ?? DEFAULTS.reminderMinute),
    alertsEnabled: raw.alertsEnabled === '1',
    lockEnabled: raw.lockEnabled === '1',
    lastAlertDate: raw.lastAlertDate ?? '',
  };
}

function serialize(value: Settings[keyof Settings]): string {
  return typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
}

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
  language: Language;
  locale: string;
  t: Translate;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getAllSettings(db).then((raw) => setSettings(parse(raw)));
  }, [db]);

  // Keep native chrome (alerts, keyboards, switches) in step with the chosen theme.
  const theme = settings?.theme;
  useEffect(() => {
    if (!theme) return;
    try {
      Appearance.setColorScheme(theme === 'auto' ? 'unspecified' : theme);
    } catch {
      // not supported on this platform
    }
  }, [theme]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      setSettings((current) => (current ? { ...current, ...patch } : current));
      for (const [key, value] of Object.entries(patch)) {
        await setSetting(db, key, serialize(value as Settings[keyof Settings]));
      }
    },
    [db]
  );

  const value = useMemo<SettingsContextValue | null>(() => {
    if (!settings) return null;
    const language = resolveLanguage(settings.language);
    return { settings, update, language, locale: LOCALES[language], t: createTranslator(language) };
  }, [settings, update]);

  // Settings load from a local DB in a few ms; render nothing until they are in.
  if (!value) {
    return null;
  }
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used inside SettingsProvider');
  }
  return context;
}

/** Shorthand for components that only need translations. */
export function useT() {
  const { t, language, locale } = useSettings();
  return { t, language, locale };
}

/** Like useSettings, but returns null outside the provider (used by the colour-scheme hook). */
export function useOptionalSettings(): SettingsContextValue | null {
  return useContext(SettingsContext);
}
