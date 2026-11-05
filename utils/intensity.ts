export type IntensityInput = {
  mood: number | null;
  stress: number | null;
  workload: number | null;
  sleepHours: number | null;
};

/** Hours of sleep below which the day is treated as short on rest. */
const RESTED_HOURS = 7;

/**
 * A rough estimate of how intense the day felt (1–10) from the other measurements:
 * a mood far from neutral, high stress, a heavy load and short sleep all push it up.
 * Unknown metrics count as neutral, so with nothing filled in it stays at 5.
 * The user can still adjust the result by hand.
 */
export function estimateIntensity({ mood, stress, workload, sleepHours }: IntensityInput): number {
  let score = 5;
  if (mood !== null) score += (Math.abs(mood - 3) - 1) * 1.2; // neutral −1.2 … extreme +1.2
  if (stress !== null) score += (stress - 3) * 1.0;
  if (workload !== null) score += (workload - 3) * 0.6;
  if (sleepHours !== null) {
    score += sleepHours < RESTED_HOURS ? Math.min(2, (RESTED_HOURS - sleepHours) * 0.6) : -0.5;
  }
  return Math.min(10, Math.max(1, Math.round(score)));
}
