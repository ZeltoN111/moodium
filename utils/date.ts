/** Local-time day key (YYYY-MM-DD). Built manually because toISOString() shifts to UTC. */
export function todayKey(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function dayKeyOf(year: number, month: number, day: number): string {
  return `${year}-${`${month + 1}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
}

/** Inclusive first/last day keys of the given month (month is 0-indexed). */
export function monthRange(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return { from: dayKeyOf(year, month, 1), to: dayKeyOf(year, month, lastDay), lastDay };
}

/** Upper-cases only the first letter (CSS `capitalize` would also upper-case every later word). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Number with a locale-appropriate decimal separator (Ukrainian uses a comma). */
export function formatNumber(value: number, digits = 1, locale?: string): string {
  const text = value.toFixed(digits);
  return locale?.toLowerCase().startsWith('uk') ? text.replace('.', ',') : text;
}

export function monthLabel(year: number, month: number, locale?: string): string {
  return capitalize(
    new Date(year, month, 1).toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    })
  );
}

/** Weekday index of the 1st, shifted so Monday is 0. */
export function firstWeekdayOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function formatDayLabel(dayKey: string, locale?: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return capitalize(
    new Date(year, month - 1, day).toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );
}

/** Days since 1970-01-01 for a day key — timezone-free, so differences are exact day counts. */
export function dayNumber(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function keyFromDayNumber(value: number): string {
  const date = new Date(value * 86_400_000);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function shiftDay(dayKey: string, delta: number): string {
  return keyFromDayNumber(dayNumber(dayKey) + delta);
}
