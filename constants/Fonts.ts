import type { TextStyle } from 'react-native';

/**
 * "Signal" type system: Unbounded for numbers and headlines, Onest for reading text,
 * JetBrains Mono for instrument-style labels. All three cover Cyrillic.
 * Each weight is its own family name, because Android ignores fontWeight for custom fonts.
 */
export const FONT_FILES = {
  Unbounded_300Light: require('../assets/fonts/Unbounded_300Light.ttf'),
  Unbounded_400Regular: require('../assets/fonts/Unbounded_400Regular.ttf'),
  Unbounded_500Medium: require('../assets/fonts/Unbounded_500Medium.ttf'),
  Onest_400Regular: require('../assets/fonts/Onest_400Regular.ttf'),
  Onest_500Medium: require('../assets/fonts/Onest_500Medium.ttf'),
  Onest_600SemiBold: require('../assets/fonts/Onest_600SemiBold.ttf'),
  JetBrainsMono_400Regular: require('../assets/fonts/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_500Medium: require('../assets/fonts/JetBrainsMono_500Medium.ttf'),
};

export const FONTS = {
  display: 'Unbounded_300Light',
  displayRegular: 'Unbounded_400Regular',
  displayMedium: 'Unbounded_500Medium',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemiBold: 'Onest_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/** Body family for a fontWeight, so existing `fontWeight: '700'` styles keep their emphasis. */
export function bodyFamily(weight: TextStyle['fontWeight']): string {
  const numeric = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (numeric >= 600) return FONTS.bodySemiBold;
  if (numeric >= 500) return FONTS.bodyMedium;
  return FONTS.body;
}

/** Small uppercase instrument label: "СОН", "ПРОГНОЗ", "14 ДН · 11 ЗАПИСІВ". */
export const LABEL: TextStyle = {
  fontFamily: FONTS.mono,
  fontSize: 11,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
};
