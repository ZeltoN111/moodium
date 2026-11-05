/**
 * "Signal" palette: a near-black instrument panel (dark) and a warm, soft paper variant (light).
 * Surfaces are separated by hairlines instead of shadows. `tint` is the brand periwinkle.
 */
const light = {
  // Warm paper instead of cool white: softer contrast, no pure black or pure white.
  text: '#23242E',
  background: '#F4F2EE',
  card: '#FBFAF7',
  cardAlt: '#ECEAE4',
  border: '#E3E0D9',
  muted: '#6B6874',
  tint: '#6461D6',
  tintSoft: '#E9E7F8',
  onTint: '#FFFFFF',
  tabIconDefault: '#6B6874',
  tabIconSelected: '#6461D6',
  danger: '#C2415A',
  shadow: '#2A2620',
  dot: 'rgba(35,36,46,0.05)',
  dock: 'rgba(251,250,247,0.96)',
  /** Filled "selected" controls: soft violet on paper instead of near-black. */
  strong: '#6461D6',
  onStrong: '#FFFFFF',
};

const dark = {
  text: '#EEF0F6',
  background: '#07080C',
  card: '#0D0E14',
  cardAlt: '#15171F',
  border: '#1E212B',
  muted: '#8F94A7',
  tint: '#8F8CFF',
  tintSoft: '#1D1C3D',
  onTint: '#07080C',
  tabIconDefault: '#A9AEC2',
  tabIconSelected: '#8F8CFF',
  danger: '#FF4D6D',
  shadow: '#000000',
  dot: 'rgba(255,255,255,0.06)',
  dock: 'rgba(12,13,19,0.97)',
  strong: '#EEF0F6',
  onStrong: '#07080C',
};

export type ThemeColors = typeof light;

export default { light, dark };
