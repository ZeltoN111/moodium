import type { IconName } from '@/components/Icon';

/** Icon for each built-in factor key (the DB `icon` column predates the SVG set and is unused). */
export const FACTOR_ICONS: Record<string, IconName> = {
  work: 'briefcase',
  sleep: 'moon',
  exercise: 'activity',
  social: 'users',
};

export function factorIcon(key: string): IconName {
  return FACTOR_ICONS[key] ?? 'sparkles';
}
