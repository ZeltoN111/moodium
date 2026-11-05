import { shiftDay } from '../utils/date';
import { weeklyRecap } from '../utils/recap';

const TODAY = '2026-03-20';
const e = (offset: number, mood: number, sleep: number | null = null) => ({
  date: shiftDay(TODAY, offset),
  mood,
  sleep_hours: sleep,
});

describe('weeklyRecap', () => {
  it('summarises the week and compares it with the previous one', () => {
    const recap = weeklyRecap(
      [e(0, 4, 7), e(-1, 2, 5), e(-3, 5, 8), e(-8, 2, 6), e(-9, 2, 6), e(-20, 5)],
      TODAY
    );
    expect(recap.daysLogged).toBe(3);
    expect(recap.avgMood).toBeCloseTo(11 / 3);
    expect(recap.moodDelta).toBeCloseTo(11 / 3 - 2);
    expect(recap.avgSleep).toBeCloseTo(20 / 3);
    expect(recap.sleepDelta).toBeCloseTo(20 / 3 - 6);
    expect(recap.best?.mood).toBe(5);
    expect(recap.worst?.mood).toBe(2);
    expect(recap.from).toBe('2026-03-14');
    expect(recap.to).toBe(TODAY);
  });

  it('handles an empty week and no previous data', () => {
    const empty = weeklyRecap([], TODAY);
    expect(empty).toMatchObject({ daysLogged: 0, avgMood: null, moodDelta: null, best: null, worst: null });
    const first = weeklyRecap([e(0, 3)], TODAY);
    expect(first.moodDelta).toBeNull();
    expect(first.worst).toBeNull(); // single day: best == worst
  });

  it('breaks ties towards the most recent day', () => {
    const recap = weeklyRecap([e(-2, 5), e(0, 5), e(-1, 1)], TODAY);
    expect(recap.best?.date).toBe(TODAY);
  });
});
