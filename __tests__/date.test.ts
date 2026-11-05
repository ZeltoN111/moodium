import { capitalize, dayNumber, formatDayLabel, formatNumber, keyFromDayNumber, shiftDay } from '../utils/date';

describe('date helpers', () => {
  it('shifts across month and year boundaries', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2028-03-01', -1)).toBe('2028-02-29');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(keyFromDayNumber(dayNumber('2026-10-11'))).toBe('2026-10-11');
  });

  it('capitalises only the first letter', () => {
    expect(capitalize('середа, 7 жовтня')).toBe('Середа, 7 жовтня');
    expect(capitalize('')).toBe('');
    expect(formatDayLabel('2026-10-07', 'uk-UA')).toMatch(/^Середа, 7 жовтня$/);
  });

  it('formats numbers with a locale decimal separator', () => {
    expect(formatNumber(2.84, 1, 'en-US')).toBe('2.8');
    expect(formatNumber(2.84, 1, 'uk-UA')).toBe('2,8');
    expect(formatNumber(70, 0, 'uk-UA')).toBe('70');
  });
});
