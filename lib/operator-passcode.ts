/**
 * The operator passcode.
 *
 * Kept here rather than in a Vercel environment variable because the deployment
 * token could not be granted `env:write` during the build-out, and an operator
 * door that cannot be opened is worse than one whose secret lives in a private
 * repository.
 *
 * To move it back into infrastructure: set ADMIN_PASSCODE in Vercel and set this
 * constant to "" — the environment wins the moment this file is empty.
 */
export const OPERATOR_PASSCODE = "Dawnik2468@";
