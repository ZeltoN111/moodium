import { estimateIntensity } from '../utils/intensity';

describe('estimateIntensity', () => {
  it('is a calm middle 5 when nothing is known', () => {
    expect(estimateIntensity({ mood: null, stress: null, workload: null, sleepHours: null })).toBe(5);
  });

  it('is low on a calm, rested, neutral day', () => {
    expect(estimateIntensity({ mood: 3, stress: 1, workload: 1, sleepHours: 8 })).toBeLessThanOrEqual(3);
  });

  it('is high on a stressful, overloaded, sleepless bad day', () => {
    expect(estimateIntensity({ mood: 1, stress: 5, workload: 5, sleepHours: 4 })).toBeGreaterThanOrEqual(9);
  });

  it('grows with how far the mood is from neutral, in either direction', () => {
    const base = { stress: 3, workload: 3, sleepHours: 7.5 };
    const neutral = estimateIntensity({ ...base, mood: 3 });
    expect(estimateIntensity({ ...base, mood: 5 })).toBeGreaterThan(neutral);
    expect(estimateIntensity({ ...base, mood: 1 })).toBeGreaterThan(neutral);
  });

  it('rises as sleep falls short', () => {
    const base = { mood: 3, stress: 3, workload: 3 };
    expect(estimateIntensity({ ...base, sleepHours: 4 })).toBeGreaterThan(estimateIntensity({ ...base, sleepHours: 8 }));
  });

  it('always returns a whole number from 1 to 10', () => {
    for (const mood of [null, 1, 3, 5]) {
      for (const stress of [null, 1, 5]) {
        for (const sleepHours of [null, 0, 14]) {
          const value = estimateIntensity({ mood, stress, workload: stress, sleepHours });
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(10);
        }
      }
    }
  });
});
