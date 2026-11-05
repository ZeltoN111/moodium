import { Easing } from 'react-native-reanimated';

/**
 * One neutral motion style for the whole app: short ease-out timings, no springs, no scaling.
 * State changes (selection, colour, position) glide; screens fade in on focus.
 */
export const MOTION = {
  fast: { duration: 160, easing: Easing.out(Easing.quad) },
  base: { duration: 220, easing: Easing.out(Easing.quad) },
  screen: { duration: 260, easing: Easing.out(Easing.quad) },
};
