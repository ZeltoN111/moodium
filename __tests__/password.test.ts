import { validatePassword } from '../utils/password';

describe('validatePassword', () => {
  it('accepts 8+ characters with letters and a capital, symbols not required', () => {
    expect(validatePassword('Moodium1')).toBeNull();
    expect(validatePassword('Password')).toBeNull();
    expect(validatePassword('Щоденник')).toBeNull();
  });

  it('rejects short passwords first', () => {
    expect(validatePassword('Abc123')).toBe('short');
    expect(validatePassword('')).toBe('short');
  });

  it('needs letters', () => {
    expect(validatePassword('12345678')).toBe('noLetter');
  });

  it('needs a capital letter', () => {
    expect(validatePassword('moodium123')).toBe('noUpper');
    expect(validatePassword('щоденник1')).toBe('noUpper');
  });
});
