import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useOptionalSettings } from '@/context/Settings';

/** Effective scheme: the user's choice in Settings, or the system one when set to "auto". */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const preference = useOptionalSettings()?.settings.theme ?? 'auto';
  if (preference !== 'auto') {
    return preference;
  }
  return system === 'dark' ? 'dark' : 'light';
}
