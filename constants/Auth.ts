/**
 * Length of the one-time code Supabase emails (Authentication → Sign In / Providers → Email →
 * "Email OTP Length"). Keep the two in step; override with EXPO_PUBLIC_OTP_LENGTH if you change it.
 */
const configured = Number(process.env.EXPO_PUBLIC_OTP_LENGTH ?? 8);
export const OTP_LENGTH = Number.isInteger(configured) && configured >= 4 && configured <= 10 ? configured : 8;

/** Supabase lets the same address request a new code only once a minute. */
export const RESEND_COOLDOWN_SECONDS = 60;
