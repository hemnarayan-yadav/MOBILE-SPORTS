// Adapted from frontend/src/api/matches.api.js — public reads only so far.
import { recordServerTime } from '../lib/serverClock.js';
import { apiClient, unwrap } from './client.js';

const listServerTime = (page) => page?.serverTime;

// Every response that carries the server's time also tells the live clocks how
// far this device's clock is from the server's (lib/serverClock.js).
function timed(request, serverTimeOf) {
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
};
