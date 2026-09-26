// Adapted from frontend/src/api/matches.api.js — the public reads (the live
// control API arrives with Phase M6).
import { recordServerTime } from '../lib/serverClock.js';
import { apiClient, unwrap } from './client.js';

const liveServerTime = (match) => match?.live?.serverTime;
const listServerTime = (page) => page?.serverTime;

// Every response that carries the server's time also tells the live clocks how
// far this device's clock is from the server's (lib/serverClock.js).
function timed(request, serverTimeOf = liveServerTime) {
  const sentAt = Date.now();
  return request().then((data) => {
    const serverTime = serverTimeOf(data);
    if (serverTime) recordServerTime(serverTime, sentAt, Date.now());
    return data;
  });
}

export const matchesApi = {
  // `{ items, pagination, serverTime }`
  list: (params) => timed(() => apiClient.get('/matches', { params }).then(unwrap), listServerTime),
  get: (id) => timed(() => apiClient.get(`/matches/${id}`).then(unwrap)),
  headToHead: (teamA, teamB) =>
    apiClient.get('/matches/head-to-head', { params: { teamA, teamB } }).then(unwrap),
};

export const rankingsApi = {
  players: (params) => apiClient.get('/rankings/players', { params }).then(unwrap),
  overview: (params) => apiClient.get('/rankings/overview', { params }).then(unwrap),
  teams: (params) => apiClient.get('/rankings/teams', { params }).then(unwrap),
};
