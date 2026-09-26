// Ported from frontend/src/utils/format.js — the helpers the app uses so far
// (unchanged); `formatRelative` is left out (Hermes has no RelativeTimeFormat).
import i18n from '../i18n/index.js';

const LOCALES = Object.freeze({ en: 'en-IN', hi: 'hi-IN' });
const locale = () => LOCALES[i18n.language] ?? LOCALES.en;

function format(value, options) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale(), options).format(new Date(value));
}

export const formatDate = (value) => format(value, { dateStyle: 'medium' });
export const formatDateTime = (value) => format(value, { dateStyle: 'medium', timeStyle: 'short' });
export const formatTime = (value) => format(value, { timeStyle: 'short' });

export const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value ?? 0);
export const formatPercent = (ratio) => `${Math.round((ratio ?? 0) * 100)}%`;

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

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

export function countdownParts(target, now = Date.now()) {
  const total = Math.max(0, new Date(target).getTime() - now);
  const seconds = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}
