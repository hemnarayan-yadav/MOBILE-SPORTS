// The offline scoreboard's clock arithmetic — pure, so it can be tested
// without a screen and without a timer.
//
// A clock is the same shape the rest of the app already uses:
// `{ runningSince, elapsedMs }` (utils/format.js). Nothing here counts; time is
// read from the two numbers whenever something draws. That is the whole reason
// the board can keep a clock on screen without the app doing work every second,
// and the reason its saved state is written only when somebody taps.
//
// `runningSince` is a plain epoch number rather than a Date, so the state
// survives being written to storage and read back as JSON unchanged.
import { clockElapsedMs } from './format.js';

/** A clock that has never run. */
export const IDLE_CLOCK = Object.freeze({ runningSince: null, elapsedMs: 0 });

// Kabaddi's raid is 30 seconds. A constant of the sport, never a setting
// (Live_Kabaddi_Project_Spec.md, product constraint 7).
export const RAID_SECONDS = 30;

// Ten minutes a half, which is what the owner's matches are played to. Unlike
// the raid clock this one is a per-match choice, so it is only the default.
export const DEFAULT_HALF_MINUTES = 10;
export const MIN_HALF_MINUTES = 1;
export const MAX_HALF_MINUTES = 60;

export const isRunning = (clock) => Boolean(clock?.runningSince);

/** Starts a stopped clock from `now`; a running clock is returned untouched. */
export function startClock(clock, now = Date.now()) {
  return isRunning(clock) ? clock : { runningSince: now, elapsedMs: clock?.elapsedMs ?? 0 };
}

/** Stops a running clock, keeping what it has counted. */
export function pauseClock(clock, now = Date.now()) {
  return isRunning(clock) ? { runningSince: null, elapsedMs: clockElapsedMs(clock, now) } : clock;
}

export const toggleClock = (clock, now = Date.now()) =>
  isRunning(clock) ? pauseClock(clock, now) : startClock(clock, now);

/** A clock back at zero, stopped. */
export const resetClock = () => ({ ...IDLE_CLOCK });

/**
 * Moves a clock by `seconds` of *remaining* time: positive gives time back,
 * negative takes it away. Used to correct a clock that was left running while
 * the phone was away, which is the one way this board's time can drift.
 *
 * Clamped at both ends, so the half can never show more than its own length
 * nor run past its end, and a clock that is running stays running — its start
 * is rebased to `now` so no time is lost in the move.
 */
export function shiftClock(clock, seconds, totalSeconds, now = Date.now()) {
  const elapsed = clockElapsedMs(clock, now);
  const moved = Math.min(Math.max(0, elapsed - seconds * 1000), totalSeconds * 1000);
  return isRunning(clock) ? { runningSince: now, elapsedMs: moved } : { runningSince: null, elapsedMs: moved };
}

export const minutesToSeconds = (minutes) => Math.round(minutes * 60);

/** Keeps a typed half length inside what a match can actually be played to. */
export const clampHalfMinutes = (minutes) =>
  Math.min(Math.max(Math.round(Number(minutes) || 0), MIN_HALF_MINUTES), MAX_HALF_MINUTES);
