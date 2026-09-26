// Ported from frontend/src/tests/serverClock.test.jsx (the offset tests, which
// cover the 2026-09-25 incident of a device clock running 25 s fast), plus the
// match list sampling that the mobile API module does.
jest.mock('../api/client.js', () => ({
  apiClient: { get: jest.fn() },
  unwrap: (response) => response.data.data,
}));

import { apiClient } from '../api/client.js';
import { matchesApi } from '../api/matches.api.js';
import {
  MAX_OFFSET_STEP_MS,
  SAMPLE_TTL_MS,
  recordServerTime,
  resetServerClock,
  serverNow,
  serverOffsetMs,
} from '../lib/serverClock.js';

const T = Date.parse('2026-09-25T06:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

beforeEach(() => resetServerClock());
afterEach(() => resetServerClock());

describe('server clock offset', () => {
  it('measures a device clock that runs ahead from the midpoint of the round trip', () => {
    recordServerTime(iso(T + 100), T + 25_000, T + 25_200);
    expect(serverOffsetMs()).toBe(-25_000);
    expect(serverNow(T + 25_000)).toBe(T);
  });

  it('keeps the sample with the shortest round trip', () => {
    recordServerTime(iso(T), T - 50, T + 50);
    recordServerTime(iso(T + 5_000), T + 3_000, T + 5_000);
    expect(serverOffsetMs()).toBe(0);

    recordServerTime(iso(T + 10_010), T + 10_000, T + 10_020);
    expect(serverOffsetMs()).toBe(0);
  });

  it('follows a corrected device clock once the best sample is stale, a few seconds at a time', () => {
    recordServerTime(iso(T), T + 24_900, T + 25_100);
    expect(serverOffsetMs()).toBe(-25_000);

    const later = T + SAMPLE_TTL_MS + 30_000;
    recordServerTime(iso(later), later - 500, later + 500);
    expect(serverOffsetMs()).toBe(-25_000 + MAX_OFFSET_STEP_MS);
  });

  it('treats a device clock set back as a reason to measure again', () => {
    recordServerTime(iso(T), T + 24_900, T + 25_100);
    recordServerTime(iso(T + 5_000), T + 4_500, T + 5_500);
    expect(serverOffsetMs()).toBe(-25_000 + MAX_OFFSET_STEP_MS);
  });

  it('ignores samples it cannot trust', () => {
    recordServerTime('not a date', T, T + 10);
    recordServerTime(iso(T), T + 10, T);
    recordServerTime('2025-01-01T00:00:00.000Z', T, T + 10);
    expect(serverOffsetMs()).toBe(0);
  });
});

describe('where the offset is measured', () => {
  it('samples every match list the API returns', async () => {
    const now = Date.now();
    apiClient.get.mockResolvedValueOnce({
      data: { data: { items: [], serverTime: iso(now - 25_000) } },
    });
    await matchesApi.list({ status: 'live' });
    expect(Math.round(serverOffsetMs() / 1000)).toBe(-25);
  });

  it('leaves the offset alone when a list carries no server time', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: { items: [] } } });
    await matchesApi.list({ status: 'live' });
    expect(serverOffsetMs()).toBe(0);
  });
});
