// Ported from frontend/src/api/queryKeys.js — the same hierarchical keys, only
// the areas the app uses so far. Invalidating a prefix (e.g. qk.matches.all)
// refreshes every query below it.
export const qk = Object.freeze({
  matches: {
    all: ['matches'],
    list: (params) => ['matches', 'list', params],
  },
  otp: { config: ['otp', 'config'] },
  media: { config: ['media', 'config'] },
  // The web keeps this key in users.api.js (ME_QUERY_KEY); same value.
  me: ['users', 'me'],
  mobile: { config: ['mobile', 'config'] },
});
