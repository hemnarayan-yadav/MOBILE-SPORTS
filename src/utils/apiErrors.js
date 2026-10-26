// Ported from frontend/src/utils/apiErrors.js (unchanged logic).
import i18n from '../i18n/index.js';

// API error codes map to `errors.<camelCaseCode>` translation keys
// (TEAM_NAME_TAKEN → errors.teamNameTaken). Unknown codes fall back to a
// generic message rather than showing raw server text.
const OVERRIDES = Object.freeze({
  INVALID_TOKEN: 'errors.invalidLink',
  NETWORK_ERROR: 'errors.network',
});

const toCamel = (code) => code.toLowerCase().replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());

export function apiErrorKey(error) {
  const code = error?.code;
  if (!code) return 'common.error';
  if (OVERRIDES[code]) return OVERRIDES[code];
  const key = `errors.${toCamel(code)}`;
  return i18n.exists(key) ? key : 'common.error';
}

/**
 * The values a message may need. The server sends a few — how many seconds
 * are left before another code may be asked for, for instance — and a message
 * that can use one says so much more than "please wait a moment".
 */
export function apiErrorParams(error) {
  const seconds = error?.details?.retryAfterSeconds;
  // i18next reads `context` as a key suffix, so a message with a countdown
  // lives at `<key>_withSeconds` and the plain one stays the fallback for a
  // server that did not say how long.
  return seconds ? { seconds, context: 'withSeconds' } : {};
}

/** The translated message for an API error, values and all. */
export const apiErrorText = (t, error) => t(apiErrorKey(error), apiErrorParams(error));
