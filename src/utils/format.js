// Ported from frontend/src/utils/format.js — only the clock helpers the app
// uses so far (unchanged); the rest are ported with the screens that need them.

export function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// Milliseconds on a clock, including the segment currently running.
// `runningSince` alone decides whether time is accruing, so this serves the
// match clock and the raid clock alike (mirrors the server-side engine helper).
// `now` must be in server time (lib/serverClock.js `serverNow`), because
// `runningSince` is stamped by the server.
export function clockElapsedMs(clock, now = Date.now()) {
  if (!clock || !clock.runningSince) return clock?.elapsedMs ?? 0;
  return clock.elapsedMs + Math.max(0, now - new Date(clock.runningSince).getTime());
}

// Seconds left on a clock, never below zero and never above its full length —
// the display can therefore not run past 00:00 or show a negative time.
export function clockRemainingSeconds(clock, totalSeconds, now = Date.now()) {
  const remaining = totalSeconds - clockElapsedMs(clock, now) / 1000;
  return Math.min(Math.max(remaining, 0), totalSeconds);
}

// A clock is spent once nothing is left on it.
export function isClockSpent(clock, totalSeconds, now = Date.now()) {
  return clockElapsedMs(clock, now) >= totalSeconds * 1000;
}
