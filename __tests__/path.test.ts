import { areaPath, moodPoints, nearestIndex, polylineLength, scalePoints, smoothPath } from '../utils/path';

describe('smoothPath', () => {
  it('returns nothing for no points and a move for one point', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 3, y: 4 }])).toBe('M3 4');
  });

  it('passes through every point with one curve segment between neighbours', () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(d.startsWith('M0 10')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
    expect(d).toContain(' 10 0 C');
    expect(d.endsWith(' 20 10')).toBe(true);
  });
});

describe('areaPath', () => {
  it('closes the curve down to the baseline', () => {
    const d = areaPath([{ x: 0, y: 5 }, { x: 10, y: 2 }], 40);
    expect(d.endsWith('L10 40 L0 40 Z')).toBe(true);
  });
});

describe('moodPoints', () => {
  it('puts mood 5 at the top, mood 1 at the bottom and skips missing days', () => {
    const points = moodPoints([5, null, 1], 100, 80, 8);
    expect(points).toEqual([
      { x: 0, y: 8 },
      { x: 100, y: 72 },
    ]);
  });
});

describe('scalePoints', () => {
  it('maps the top of the range to the top padding and clamps outliers', () => {
    expect(scalePoints([100, 0, 150], 20, 100, 0, 100, 0)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 100 },
      { x: 20, y: 0 },
    ]);
  });
});

describe('polylineLength', () => {
  it('adds up the straight segments', () => {
    expect(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBe(11);
    expect(polylineLength([{ x: 1, y: 1 }])).toBe(0);
  });
});

describe('nearestIndex', () => {
  it('snaps a touch position to the closest slot and stays in range', () => {
    expect(nearestIndex(0, 100, 5)).toBe(0);
    expect(nearestIndex(37, 100, 5)).toBe(1);
    expect(nearestIndex(38, 100, 5)).toBe(2);
    expect(nearestIndex(-20, 100, 5)).toBe(0);
    expect(nearestIndex(500, 100, 5)).toBe(4);
    expect(nearestIndex(50, 100, 1)).toBe(0);
  });
});
