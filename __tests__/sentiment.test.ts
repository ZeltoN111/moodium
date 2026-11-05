import { analyzeSentiment } from '../utils/sentiment';

describe('analyzeSentiment', () => {
  it('returns neutral for empty or unknown text', () => {
    expect(analyzeSentiment('')).toMatchObject({ score: 0, hits: 0 });
    expect(analyzeSentiment(null).score).toBe(0);
    expect(analyzeSentiment('купив хліб і молоко').hits).toBe(0);
  });

  it('detects negative Ukrainian notes', () => {
    const result = analyzeSentiment('Дуже втомився, дедлайн і стрес, безсоння');
    expect(result.negative).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThan(-0.5);
  });

  it('detects positive English notes', () => {
    const result = analyzeSentiment('Great day, felt calm and happy');
    expect(result.positive).toBe(3);
    expect(result.score).toBe(1);
  });

  it('flips polarity after a negation', () => {
    expect(analyzeSentiment('не втомився').score).toBe(1);
    expect(analyzeSentiment('I am not happy').score).toBe(-1);
  });

  it('balances mixed notes', () => {
    expect(analyzeSentiment('tired but happy').score).toBe(0);
  });

  it('does not match short words inside longer ones', () => {
    expect(analyzeSentiment('badminton and sadness').negative).toBe(0);
  });
});
