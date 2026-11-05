/** Rules for a new password: 8+ characters, letters (any alphabet), at least one capital. No symbols required. */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordProblem = 'short' | 'noLetter' | 'noUpper';

export function validatePassword(password: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'short';
  if (!/\p{L}/u.test(password)) return 'noLetter';
  if (!/\p{Lu}/u.test(password)) return 'noUpper';
  return null;
}
