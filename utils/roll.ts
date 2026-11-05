export type Slot = {
  /** Stable key counted from the right, so the units digit keeps its slot when the length changes. */
  key: string;
  char: string;
  digit: boolean;
};

/** Splits a formatted number ("4,5", "09 / 10") into per-character slots keyed from the right. */
export function slotsOf(text: string): Slot[] {
  const chars = Array.from(text);
  return chars.map((char, index) => ({
    key: `s${chars.length - 1 - index}`,
    char,
    digit: /\d/.test(char),
  }));
}

/** +1 when the value grew (digits roll up), −1 when it fell (roll down), 0 when unknown or equal. */
export function rollDirection(previous: number | null, next: number | null): 1 | -1 | 0 {
  if (previous === null || next === null || previous === next) return 0;
  return next > previous ? 1 : -1;
}
