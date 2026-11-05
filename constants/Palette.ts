import { useColorScheme } from '@/components/useColorScheme';
import type { RiskLevel } from '@/utils/burnout';

/**
 * Mood scale: coral → orange → sand → muted teal → lime. Neighbours also differ in lightness,
 * so the scale still reads without colour vision.
 *
 * `ink` is for lines, text and small marks on the page background; `fill` is for large tiles
 * (the calendar), with `onFill` as the readable text colour on top of each tile.
 */
const MOOD = {
  dark: {
    ink: ['#FF3B5F', '#FF8A3D', '#FFD23F', '#4CCFAE', '#B8F53A'],
    fill: ['#FF3B5F', '#FF8A3D', '#FFD23F', '#4CCFAE', '#B8F53A'],
    onFill: ['#07080C', '#07080C', '#07080C', '#07080C', '#07080C'],
  },
  light: {
    // Softer, pastel tiles on warm paper; deeper inks keep text and lines readable.
    ink: ['#C8375A', '#C46526', '#9A7A10', '#1F8A73', '#5A8A12'],
    fill: ['#F48A9B', '#F7AE7E', '#F3D77E', '#86D3BE', '#C9E98A'],
    onFill: ['#23242E', '#23242E', '#23242E', '#23242E', '#23242E'],
  },
};

const RISK: Record<'dark' | 'light', Record<RiskLevel, string>> = {
  dark: { low: '#6FE3C8', moderate: '#FFB547', high: '#FF4D6D' },
  light: { low: '#1F8A73', moderate: '#B7791F', high: '#C8375A' },
};

export type Palette = {
  /** Mood colour for lines, text and small marks. */
  mood: (value: number) => string;
  /** Mood colour for large filled tiles. */
  moodFill: (value: number) => string;
  /** Text colour on top of moodFill. */
  onMoodFill: (value: number) => string;
  risk: Record<RiskLevel, string>;
  /** Text drawn on top of a filled risk/accent colour. */
  onData: string;
};

const slot = (value: number) => Math.min(5, Math.max(1, Math.round(value))) - 1;

export function paletteFor(scheme: 'light' | 'dark'): Palette {
  const moods = MOOD[scheme];
  return {
    mood: (value) => moods.ink[slot(value)],
    moodFill: (value) => moods.fill[slot(value)],
    onMoodFill: (value) => moods.onFill[slot(value)],
    risk: RISK[scheme],
    onData: scheme === 'dark' ? '#07080C' : '#FFFFFF',
  };
}

export function usePalette(): Palette {
  return paletteFor(useColorScheme());
}

/** Risk zone colour for any 0–100 index value. */
export function zoneColor(palette: Palette, score: number): string {
  return score < 35 ? palette.risk.low : score < 60 ? palette.risk.moderate : palette.risk.high;
}
