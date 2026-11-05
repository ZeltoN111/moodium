jest.mock('@/components/useColorScheme', () => ({ useColorScheme: () => 'dark' }));

import { paletteFor, zoneColor } from '../constants/Palette';

describe('paletteFor', () => {
  it.each(['dark', 'light'] as const)('gives five distinct moods in %s theme', (scheme) => {
    const palette = paletteFor(scheme);
    const inks = [1, 2, 3, 4, 5].map(palette.mood);
    const fills = [1, 2, 3, 4, 5].map(palette.moodFill);
    expect(new Set(inks).size).toBe(5);
    expect(new Set(fills).size).toBe(5);
  });

  it('clamps and rounds out-of-range moods', () => {
    const palette = paletteFor('dark');
    expect(palette.mood(0)).toBe(palette.mood(1));
    expect(palette.mood(9)).toBe(palette.mood(5));
    expect(palette.moodFill(3.6)).toBe(palette.moodFill(4));
  });

  it('maps index values onto risk zones', () => {
    const palette = paletteFor('dark');
    expect(zoneColor(palette, 10)).toBe(palette.risk.low);
    expect(zoneColor(palette, 35)).toBe(palette.risk.moderate);
    expect(zoneColor(palette, 60)).toBe(palette.risk.high);
  });
});
