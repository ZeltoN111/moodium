import type { RiskLevel } from '@/utils/burnout';

import { Platform } from 'react-native';

import { FONTS } from '@/constants/Fonts';

/** SVG text does not inherit the app font on web, so name a stack explicitly. */
export const CHART_FONT = Platform.select({
  web: `${FONTS.mono}, ui-monospace, monospace`,
  default: FONTS.mono,
});

/** Print-safe risk colours for places without a theme (the PDF report on white). In the UI use usePalette(). */
export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#0E9A80',
  moderate: '#C7790A',
  high: '#D42A4C',
};
