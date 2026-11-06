// Profile completion for the account badge on the home screen. A low-granularity
// four-field model gives a percentage that feels earned rather than one that
// jumps from 0 to 100 on a single save, and that stays honest when sign-up
// sends "0" as the jersey placeholder (which the backend reads as filled).
//
// Players and captains: name, jersey (not the "0" placeholder), photo, birthday.
// Email is NOT counted (owner's call, 2026-11-03: players run on a WhatsApp
// number, email is never required).
//
// Organisers (Admin / Manager / Super Admin): name, email — the two fields
// their account cannot work without. Photo and birthday are not asked of them
// (they have no player profile), so the check matches what they actually see.

import { ORGANISER_ROLES } from './constants.js';

const JERSEY_PLACEHOLDER = '0';

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);

const nonEmpty = (value) => {
  const v = trimmed(value);
  return v !== null && v !== undefined && v !== '';
};

function playerFields(user) {
  const profile = user?.profile ?? null;
  return [
    { key: 'name', filled: nonEmpty(user?.name) },
    {
      key: 'jerseyNumber',
      filled:
        profile &&
        nonEmpty(profile.jerseyNumber) &&
        String(profile.jerseyNumber) !== JERSEY_PLACEHOLDER,
    },
    { key: 'photoUrl', filled: Boolean(profile?.photoUrl || user?.avatarUrl) },
    { key: 'dob', filled: Boolean(profile?.dob) },
  ];
}

function organiserFields(user) {
  return [
    { key: 'name', filled: nonEmpty(user?.name) },
    { key: 'email', filled: nonEmpty(user?.email) },
  ];
}

/**
 * The account's completion as the home badge reads it.
 *
 * Returns `{ percent, filled, total, missing[], isOrganiser }`. `percent` is a
 * whole number from 0 to 100; `missing` lists the keys not yet filled so the
 * tooltip can say what remains.
 */
export function computeProfileCompletion(user) {
  const isOrganiser = Boolean(user?.role) && ORGANISER_ROLES.includes(user.role);
  const fields = isOrganiser ? organiserFields(user) : playerFields(user);
  const total = fields.length;
  const filled = fields.filter((f) => f.filled).length;
  const percent = total === 0 ? 100 : Math.round((filled / total) * 100);
  return {
    percent,
    filled,
    total,
    missing: fields.filter((f) => !f.filled).map((f) => f.key),
    isOrganiser,
  };
}

/**
 * The ring colour for the given percentage, by palette key — resolved against
 * the theme by the caller. Red up to a third, warning up to two thirds, info
 * through the final stretch, success only at a full profile.
 */
export function completionTone(percent) {
  if (percent >= 100) return 'success';
  if (percent >= 67) return 'info';
  if (percent >= 34) return 'warning';
  return 'danger';
}
