// Ported from frontend/src/api/queryKeys.js — the same hierarchical keys, only
// the areas the app uses so far. Invalidating a prefix (e.g. qk.matches.all)
// refreshes every query below it.
export const qk = Object.freeze({
  teams: {
    all: ['teams'],
    list: (params) => ['teams', 'list', params],
    detail: (id) => ['teams', 'detail', id],
    stats: (id) => ['teams', 'stats', id],
    registrations: (id) => ['teams', 'registrations', id],
  },
  players: {
    all: ['players'],
    list: (params) => ['players', 'list', params],
    detail: (id) => ['players', 'detail', id],
    stats: (id) => ['players', 'stats', id],
  },
  tournaments: {
    all: ['tournaments'],
    list: (params) => ['tournaments', 'list', params],
    detail: (id) => ['tournaments', 'detail', id],
    teams: (id, params) => ['tournaments', 'teams', id, params],
    jerseys: (id, teamId) => ['tournaments', 'jerseys', id, teamId],
    stats: (id) => ['tournaments', 'stats', id],
  },
  matches: {
    all: ['matches'],
    list: (params) => ['matches', 'list', params],
    ranked: (params) => ['matches', 'ranked', params],
    detail: (id) => ['matches', 'detail', id],
    headToHead: (a, b) => ['matches', 'h2h', a, b],
  },
  rankings: {
    all: ['rankings'],
    players: (params) => ['rankings', 'players', params],
    overview: (params) => ['rankings', 'overview', params],
    teams: (params) => ['rankings', 'teams', params],
  },
  invitations: {
    preview: (token) => ['invitations', 'preview', token],
    team: (teamId) => ['invitations', 'team', teamId],
  },
  notifications: {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
  },
  follows: {
    all: ['follows'],
    list: ['follows', 'list'],
    status: (type, id) => ['follows', 'status', type, id],
  },
  home: ['home'],
  newsFeed: {
    all: ['news-feed'],
    list: (params) => ['news-feed', 'list', params],
  },
  notices: {
    all: ['notices'],
    list: (params) => ['notices', 'list', params],
    item: (id) => ['notices', 'item', id],
    mine: (params) => ['notices', 'mine', params],
  },
  content: {
    all: ['content'],
    news: (params) => ['content', 'news', params],
    article: (slug) => ['content', 'article', slug],
  },
  users: {
    all: ['users'],
    search: (params) => ['users', 'search', params],
  },
  otp: { config: ['otp', 'config'] },
  media: { config: ['media', 'config'] },
  // The web keeps this key in users.api.js (ME_QUERY_KEY); same value.
  me: ['users', 'me'],
  mobile: { config: ['mobile', 'config'] },
});
