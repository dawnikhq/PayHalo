/**
 * Fallback operator passcode, used only when ADMIN_PASSCODE is empty.
 *
 * ADMIN_PASSCODE is set in Vercel and takes precedence, so rotating the passcode
 * means changing the environment variable and nothing else.
 */
export const OPERATOR_PASSCODE = "Dawnik2468@";
