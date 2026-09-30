// Calendar arithmetic for the app's date picker (components/common/DateField).
//
// Mobile-only: the web reaches a real calendar through `<input type="date">` and
// needs none of this. A date crosses the API and the shared Zod schemas as a
// `YYYY-MM-DD` string, never as a Date, so that is what these return.
import i18n from '../i18n/index.js';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// The week starts on Monday, as the picker was designed.
const WEEK_STARTS_ON = 1;
export const DAYS_IN_WEEK = 7;

// utils/format.js keeps its own copy of this map, but that file is ported from
// the web and drift-checked against it, and the web has no use for month or
// weekday labels — so this stays here rather than being added to it.
const LOCALES = Object.freeze({ en: 'en-IN', hi: 'hi-IN' });
const locale = () => LOCALES[i18n.language] ?? LOCALES.en;

export const isISODate = (value) => typeof value === 'string' && ISO.test(value);

// `YYYY-MM-DD` for a local calendar day. Deliberately not
// `toISOString().slice(0, 10)`: that converts to UTC, and east of Greenwich it
// hands back the day before for any time earlier than 05:30 IST.
export function toISODate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// The local Date a stored string names, or null when the string is not a date.
export function parseISODate(value) {
  if (!isISODate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Refuses 2026-02-31, which `Date` would roll forward into March.
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// The month laid out as weeks of seven, each cell a day number or null for the
// padding before the 1st and after the last.
export function monthGrid(year, month) {
  const total = daysInMonth(year, month);
  const firstWeekday = new Date(year, month, 1).getDay();
  const lead = (firstWeekday - WEEK_STARTS_ON + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % DAYS_IN_WEEK !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += DAYS_IN_WEEK) weeks.push(cells.slice(i, i + DAYS_IN_WEEK));
  return weeks;
}

// Month arithmetic that cannot land on a day the new month does not have:
// a step from 31 January is 28 February, not 3 March.
export function addMonths({ year, month }, step) {
  const moved = new Date(year, month + step, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

// Whether a day is outside the picker's bounds. Bounds are inclusive, and an
// absent bound does not restrict anything.
export function isOutOfBounds(iso, min, max) {
  if (!isISODate(iso)) return true;
  if (isISODate(min) && iso < min) return true;
  return Boolean(isISODate(max) && iso > max);
}

// Every whole year a picker with these bounds may offer, newest first — which is
// the order a date of birth is looked for in.
export function yearsInRange(min, max) {
  const first = parseISODate(min)?.getFullYear() ?? new Date().getFullYear() - 100;
  const last = parseISODate(max)?.getFullYear() ?? new Date().getFullYear() + 10;
  return Array.from({ length: last - first + 1 }, (_, i) => last - i);
}

// The day a whole number of years from now, as a bound. `age(60)` and `age(10)`
// are the oldest and youngest dates of birth the API accepts for a player
// (backend players.validation.js).
export function isoYearsAgo(years, now = new Date()) {
  return toISODate(new Date(now.getFullYear() - years, now.getMonth(), now.getDate()));
}

export const todayISO = (now = new Date()) => toISODate(now);

// "July 1998" in the reader's language, for the sheet's header.
export function monthYearLabel(year, month) {
  return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  );
}

// The seven weekday initials, in the reader's language, starting on Monday.
export function weekdayLabels() {
  const format = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
  // 4 January 1970 was a Sunday, so this walks a known week.
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    format.format(new Date(1970, 0, 4 + WEEK_STARTS_ON + i)),
  );
}
