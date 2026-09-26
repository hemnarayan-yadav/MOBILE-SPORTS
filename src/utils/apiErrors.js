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
