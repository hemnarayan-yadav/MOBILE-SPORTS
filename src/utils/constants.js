// Ported from frontend/src/utils/constants.js — only the values the app uses so
// far; the rest are ported with the screens that need them.

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  ADMIN: 'admin',
  CAPTAIN: 'captain',
  USER: 'user',
});

// The backend's role groupings (backend utils/constants.js), under the same
// names. The list that used to be called MANAGER_ROLES here is ORGANISER_ROLES:
// with a Manager role in existence that name would read as "the Manager's
// roles".
//
// All three are mirrored whole, including the ones the app has no screen for
// (it is a player and captain app — the organiser desks are on the website), so
// a role check copied from the web can never land here half-right.
//
// Who runs competitions: tournaments, matches, live control and their media.
export const ORGANISER_ROLES = Object.freeze([ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPER_ADMIN]);

// Who runs the news desk and the gallery — deliberately without Admin.
export const CONTENT_ROLES = Object.freeze([ROLES.MANAGER, ROLES.SUPER_ADMIN]);

// Who may create and manage any team and its squad. A team's own captain is
// authorized separately, by team.
export const TEAM_ADMIN_ROLES = Object.freeze([ROLES.MANAGER, ROLES.SUPER_ADMIN]);

// The roles this app actually has screens for: a player, and a captain with a
// squad. An organiser signing in on the phone has no captain desk and no player
// profile, so those surfaces are hidden rather than shown empty.
export const PLAYER_ROLES = Object.freeze([ROLES.USER, ROLES.CAPTAIN]);

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

// The shirt number is one to three digits (utils/validation.js and the API
// agree); inputs stop typing at that length rather than letting a fourth digit
// be typed and then refused.
export const JERSEY_MAX_LENGTH = 3;

// Kabaddi rules the UI needs before a match exists (the API stays authoritative).
export const KABADDI = Object.freeze({
  playersOnCourt: 7,
  minSquadSize: 7,
  maxTeamSquadSize: 25,
});
