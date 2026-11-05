import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useOptionalSettings } from '@/context/Settings';

/**
 * Same contract as the native hook. During static rendering the system scheme is unknown, so
 * the first render is always light and the real value is applied after hydration.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hydrated, setHydrated] = useState(false);
  const system = useSystemColorScheme();
  const preference = useOptionalSettings()?.settings.theme ?? 'auto';

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (preference !== 'auto') {
    return preference;
  }
  return hydrated && system === 'dark' ? 'dark' : 'light';
}
