// Ported from frontend/src/utils/constants.js — only the values the app uses so
// far; the rest are ported with the screens that need them.

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  CAPTAIN: 'captain',
  USER: 'user',
});

export const MANAGER_ROLES = Object.freeze([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

// How the API verifies phone numbers (GET /otp/config): `code` — KhelScore's own
// code-entry dialog; `widget` — the provider's browser widget.
export const OTP_FLOWS = Object.freeze({ CODE: 'code', WIDGET: 'widget' });

// How a one-time code reached the person, which is all the code dialog needs to
// word itself. Phone channels come from the API; email codes are our own.
export const OTP_CHANNELS = Object.freeze({ WHATSAPP: 'whatsapp', SMS: 'sms', EMAIL: 'email' });

// Accounts and teams share the same two states (the web keeps TEAM_STATUS as
// an alias of USER_STATUS on the API side).
export const TEAM_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });

export const MATCH_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

// The stage a match belongs to (backend utils/constants.js MATCH_ROUNDS).
// OTHER carries a free-text `roundLabel`; a friendly has no round at all.
export const MATCH_ROUNDS = Object.freeze([
  'league',
  'knockout',
  'quarter_final',
  'semi_final',
  'final',
  'other',
]);

export const ROUND_OTHER = 'other';

// The rounds that get their own look on a card and a match page.
export const KNOCKOUT_ROUNDS = Object.freeze(['quarter_final', 'semi_final', 'final']);

export const PLAYING_ROLES = Object.freeze(['raider', 'defender', 'all_rounder']);

export const LEADERBOARD_CATEGORIES = Object.freeze([
  'best_raider',
  'best_defender',
  'best_allrounder',
]);

// Kabaddi rules the UI needs before a match exists (the API stays authoritative).
export const KABADDI = Object.freeze({
  playersOnCourt: 7,
  minSquadSize: 7,
  maxTeamSquadSize: 25,
});
