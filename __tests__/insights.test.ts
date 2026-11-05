import { currentStreak, factorImpacts, moodDistribution, pearson, tagStats } from '../utils/insights';

describe('insights', () => {
  const entries = [
    { date: '2026-03-18', mood: 5, factorKeys: ['exercise'], tags: ['walk'] },
    { date: '2026-03-19', mood: 4, factorKeys: ['exercise'], tags: ['walk', 'coffee'] },
    { date: '2026-03-20', mood: 2, factorKeys: [], tags: ['deadline'] },
    { date: '2026-03-21', mood: 1, factorKeys: [], tags: ['deadline'] },
  ];

  it('compares mood with and without a factor', () => {
    const [impact] = factorImpacts(entries, ['exercise']);
    expect(impact.avgWith).toBe(4.5);
    expect(impact.avgWithout).toBe(1.5);
    expect(impact.diff).toBe(3);
  });

  it('skips factors without enough days on both sides', () => {
    expect(factorImpacts(entries, ['social'])).toEqual([]);
  });

  it('ranks tags by usage', () => {
    const stats = tagStats(entries);
    expect(stats.map((t) => t.name)).toEqual(['deadline', 'walk']);
    expect(stats[0]).toMatchObject({ count: 2, avgMood: 1.5 });
  });

  it('counts the streak, tolerating an unlogged today', () => {
    expect(currentStreak(entries, '2026-03-21')).toBe(4);
    expect(currentStreak(entries, '2026-03-22')).toBe(4);
    expect(currentStreak(entries, '2026-03-25')).toBe(0);
  });

  it('builds a mood distribution', () => {
    expect(moodDistribution(entries)).toEqual([1, 1, 0, 1, 1]);
  });

  it('computes pearson correlation', () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
});
