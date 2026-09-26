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

export const MATCH_STATUS = Object.freeze({
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const PLAYING_ROLES = Object.freeze(['raider', 'defender', 'all_rounder']);

export const LEADERBOARD_CATEGORIES = Object.freeze([
  'best_raider',
  'best_defender',
  'best_allrounder',
]);

// Kabaddi rules the UI needs before a match exists (the API stays authoritative).
export const KABADDI = Object.freeze({ playersOnCourt: 7 });
