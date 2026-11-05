import { bedtimeShiftMinutes, buildAdvice } from '../utils/advice';
import { calculateBurnout } from '../utils/burnout';
import type { BurnoutInput, BurnoutResult } from '../utils/burnout';
import { shiftDay } from '../utils/date';

const TODAY = '2026-03-20';

function entry(offset: number, overrides: Partial<BurnoutInput> = {}): BurnoutInput {
  return {
    date: shiftDay(TODAY, offset),
    mood: 4,
    note: null,
    sleep_hours: 8,
    stress: 2,
    workload: 2,
    factorKeys: ['exercise', 'social'],
    ...overrides,
  };
}

describe('buildAdvice', () => {
  it('returns nothing without enough data', () => {
    expect(buildAdvice(calculateBurnout([entry(0)], TODAY), [])).toEqual([]);
  });

  it('says to keep going when everything is fine', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry(-i));
    const advice = buildAdvice(calculateBurnout(entries, TODAY), []);
    expect(advice.map((a) => a.id)).toEqual(['keepUp']);
  });

  it('turns the worst problems into specific steps, biggest first', () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      entry(-i, { sleep_hours: 4.5, stress: 5, workload: 5, mood: 2, factorKeys: [] })
    );
    const burnout = calculateBurnout(entries, TODAY);
    const advice = buildAdvice(burnout, []);
    const steps = advice.filter((a) => a.id !== 'professional');
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.length).toBeLessThanOrEqual(3);
    expect(new Set(advice.map((a) => a.id)).size).toBe(advice.length);
    expect(advice.some((a) => a.id === 'sleep' && a.params.avg === 4.5)).toBe(true);
    // High risk always ends with the professional-support note.
    expect(burnout.level).toBe('high');
    expect(advice[advice.length - 1].id).toBe('professional');
  });

  it('recommends a factor that works for this person when there is room', () => {
    const burnout: BurnoutResult = {
      status: 'ok',
      score: 45,
      level: 'moderate',
      entryCount: 10,
      windowDays: 14,
      reasons: [],
      components: [
        { key: 'sleep', risk: 0.6, weight: 0.13, value: 6, available: true, points: 8, maxPoints: 13 },
      ],
    };
    const exercise = { key: 'exercise', withCount: 4, withoutCount: 4, avgWith: 3.6, avgWithout: 2.4, diff: 1.2 };
    const advice = buildAdvice(burnout, [exercise]);
    expect(advice.map((a) => a.id)).toEqual(['sleep', 'factor']);
    expect(advice[1]).toMatchObject({ factorKey: 'exercise', params: { diff: 1.2 } });

    // Work is a load, not a remedy, even if the numbers say so; too few days is not a pattern either.
    expect(buildAdvice(burnout, [{ ...exercise, key: 'work' }]).map((a) => a.id)).toEqual(['sleep']);
    expect(buildAdvice(burnout, [{ ...exercise, withCount: 2 }]).map((a) => a.id)).toEqual(['sleep']);
  });

  it('shifts bedtime by half the sleep deficit in 15 minute steps', () => {
    expect(bedtimeShiftMinutes(7.5)).toBe(15);
    expect(bedtimeShiftMinutes(6)).toBe(45);
    expect(bedtimeShiftMinutes(3)).toBe(60);
  });
});
