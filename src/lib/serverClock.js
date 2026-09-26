// Ported from frontend/src/lib/serverClock.js (unchanged).
//
// The server's idea of "now", as seen from this device.
//
// Every live clock (match, raid, timeout, raid delay) is stamped with the
// server's time, but ticks against this device's clock. A device whose clock is
// off by 25 s would show a 30-second raid starting at 5. Each live snapshot
// carries `serverTime`, so the offset between the two clocks is estimated from
// the requests that return one: the server stamped it somewhere between sending
// and receiving, so the midpoint is off by at most half the round trip.
//
// The sample with the shortest round trip is kept, as the most exact one. It
// goes stale after a while so a device clock that is corrected mid-session is
// followed, and no single sample may move the offset by more than a few
// seconds, so one odd response cannot make every clock jump.

export const SAMPLE_TTL_MS = 5 * 60_000;
export const MAX_OFFSET_STEP_MS = 5_000;
// A device a day or more adrift is not a clock error this can fix; such a
// sample is ignored rather than trusted.
export const MAX_OFFSET_MS = 24 * 60 * 60_000;

let offsetMs = 0;
let best = null; // { roundTripMs, takenAt }

const clamp = (value, limit) => Math.min(Math.max(value, -limit), limit);

// Records one sample: `serverTime` from a response, `sentAt` / `receivedAt`
// from this device's clock around the request that returned it.
export function recordServerTime(serverTime, sentAt, receivedAt) {
  const serverMs = new Date(serverTime).getTime();
  const roundTripMs = receivedAt - sentAt;
  if (!Number.isFinite(serverMs) || !Number.isFinite(roundTripMs) || roundTripMs < 0) return;

  const sample = serverMs - (sentAt + receivedAt) / 2;
  if (Math.abs(sample) > MAX_OFFSET_MS) return;

  // Measured on the device clock, so a device clock set back counts as stale
  // straight away rather than keeping an offset that no longer applies.
  const stale = best && (receivedAt - best.takenAt > SAMPLE_TTL_MS || receivedAt < best.takenAt);
  if (best && !stale && roundTripMs > best.roundTripMs) return;

  offsetMs = best ? offsetMs + clamp(sample - offsetMs, MAX_OFFSET_STEP_MS) : sample;
  best = { roundTripMs, takenAt: receivedAt };
}

export function serverOffsetMs() {
  return offsetMs;
}

// `deviceNow` (usually a ticking `useNow` value) expressed in server time.
export function serverNow(deviceNow = Date.now()) {
  return deviceNow + offsetMs;
}

export function resetServerClock() {
  offsetMs = 0;
  best = null;
}
