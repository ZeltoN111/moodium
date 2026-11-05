/** `#rrggbb` + alpha → `rgba(...)`, for colour interpolation (Reanimated wants explicit alpha). */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return hex;
  const n = parseInt(clean, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
