import { createTranslator } from '../i18n';
import en from '../i18n/en';
import uk from '../i18n/uk';

describe('i18n', () => {
  it('fills placeholders', () => {
    expect(createTranslator('en')('reason_moodLevel', { avg: 2.8 })).toBe('Average mood is low (2.8 / 5).');
  });

  it('uses a decimal comma in Ukrainian only', () => {
    expect(createTranslator('uk')('reason_moodLevel', { avg: 2.8 })).toContain('2,8');
    expect(createTranslator('uk')('reason_lowDays', { percent: 43 })).toContain('43%');
    expect(createTranslator('en')('reason_moodLevel', { avg: 2.8 })).toContain('2.8');
  });

  it('keeps unknown placeholders visible instead of printing undefined', () => {
    expect(createTranslator('en')('reason_moodLevel', {})).toContain('{avg}');
  });

  it('has the same keys and the same placeholders in both languages', () => {
    expect(Object.keys(uk).sort()).toEqual(Object.keys(en).sort());
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect([key, placeholders(uk[key])]).toEqual([key, placeholders(en[key])]);
    }
  });
});
