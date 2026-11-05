import { RISK_WEIGHTS, calculateBurnout, burnoutSeries, levelFor, slope } from '../utils/burnout';
import type { BurnoutInput } from '../utils/burnout';
import { shiftDay } from '../utils/date';
import { generateDemoEntries } from '../utils/demo';

const TODAY = '2026-03-20';

function entry(offset: number, overrides: Partial<BurnoutInput> = {}): BurnoutInput {
  return {
    date: shiftDay(TODAY, offset),
    mood: 4,
    note: null,
    sleep_hours: 8,
    stress: 2,
    workload: 2,
    factorKeys: ['exercise'],
    ...overrides,
  };
}

const toInput = (e: ReturnType<typeof generateDemoEntries>[number]): BurnoutInput => ({
  date: e.date,
  mood: e.mood,
  note: e.note,
  sleep_hours: e.sleepHours,
  stress: e.stress,
  workload: e.workload,
  factorKeys: e.factorKeys,
});

describe('calculateBurnout', () => {
  it('needs a minimum amount of data', () => {
    const result = calculateBurnout([entry(0), entry(-1)], TODAY);
    expect(result.status).toBe('insufficient');
    expect(result.entryCount).toBe(2);
  });

  it('ignores entries outside the window', () => {
    const result = calculateBurnout([entry(0), entry(-1), entry(-2), entry(-40, { mood: 1 })], TODAY);
    expect(result.entryCount).toBe(3);
  });

  it('gives a low score for a healthy fortnight', () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry(-i, { note: 'Great calm day' }));
    const result = calculateBurnout(entries, TODAY);
    expect(result.status).toBe('ok');
    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(20);
    expect(result.reasons).toHaveLength(0);
  });

  it('gives a high score and reasons for a bad fortnight', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry(-i, {
        mood: 1,
        note: 'Exhausted, stress and panic',
        sleep_hours: 4.5,
        stress: 5,
        workload: 5,
        factorKeys: [],
      })
    );
    const result = calculateBurnout(entries, TODAY);
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThan(80);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
  });

  it('splits the score into per-signal points that add up to it', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry(-i, { mood: 2, note: 'tired and stressed', sleep_hours: 5, stress: 4, workload: 4 })
    );
    const result = calculateBurnout(entries, TODAY);
    const total = result.components.reduce((sum, c) => sum + c.points, 0);
    const max = result.components.reduce((sum, c) => sum + c.maxPoints, 0);
    expect(total).toBeCloseTo(result.score, 0);
    expect(max).toBeCloseTo(100);
    result.components.forEach((c) => expect(c.points).toBeLessThanOrEqual(c.maxPoints + 1e-9));
  });

  it('flags a falling mood trend', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry(-(7 - i), { mood: Math.max(1, 5 - i) }));
    const trend = calculateBurnout(entries, TODAY).components.find((c) => c.key === 'moodTrend')!;
    expect(trend.value).toBeLessThan(0);
    expect(trend.risk).toBeGreaterThan(0.8);
  });

  it('detects consecutive overload days', () => {
    const entries = [
      entry(-5), entry(-4),
      entry(-3, { sleep_hours: 5, workload: 5 }),
      entry(-2, { sleep_hours: 4, stress: 4 }),
      entry(-1, { sleep_hours: 5.5, workload: 4 }),
      entry(0),
    ];
    const overload = calculateBurnout(entries, TODAY).components.find((c) => c.key === 'overload')!;
    expect(overload.value).toBe(3);
  });

  it('works without sleep/stress data by dropping those signals', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entry(-i, { sleep_hours: null, stress: null, workload: null })
    );
    const result = calculateBurnout(entries, TODAY);
    const unavailable = result.components.filter((c) => !c.available).map((c) => c.key);
    expect(unavailable).toEqual(expect.arrayContaining(['sleep', 'load', 'overload']));
    expect(result.status).toBe('ok');
  });

  it('demo data: relaxed start is low risk, the slide ends in high risk', () => {
    const demo = generateDemoEntries(TODAY, 'en').map(toInput);
    expect(calculateBurnout(demo, TODAY).level).toBe('high');
    expect(calculateBurnout(demo, shiftDay(TODAY, -18)).level).toBe('low');
  });
});

describe('helpers', () => {
  it('has weights that add up to 100%', () => {
    const total = Object.values(RISK_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1);
  });

  it('maps scores to levels', () => {
    expect(levelFor(0)).toBe('low');
    expect(levelFor(35)).toBe('moderate');
    expect(levelFor(60)).toBe('high');
  });

  it('computes a regression slope', () => {
    expect(slope([0, 1, 2, 3], [5, 4, 3, 2])).toBeCloseTo(-1);
    expect(slope([1, 1], [2, 3])).toBe(0);
  });

  it('builds a series with null while data is thin', () => {
    const series = burnoutSeries([entry(0), entry(-1), entry(-2)], TODAY, 5);
    expect(series).toHaveLength(5);
    expect(series[0].score).toBeNull();
    expect(series[4].score).not.toBeNull();
  });
});
