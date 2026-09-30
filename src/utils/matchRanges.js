// Named date ranges for the completed-match filter.
//
// The web filters the archive with a real from/to pair, which needs a date
// input; React Native has none, and a picker would mean a native module and a
// fresh dev-client build. These ranges answer the same question — "how far back"
// — with the controls the app already has. The real from/to pair stays the
// web's.
//
// Each range is an open-ended start: the API's `from` bound, with no `to`, so
// "last 7 days" means the last seven days up to now and needs no upper edge.
const DAY_MS = 24 * 60 * 60 * 1000;

export const MATCH_RANGES = Object.freeze({
  LAST_7_DAYS: 'last7Days',
  LAST_30_DAYS: 'last30Days',
  THIS_YEAR: 'thisYear',
});

// The moment a range starts, as the ISO string the API takes. An unset or
// unknown range has no start: every completed match is then in scope.
export function rangeStart(range, now = Date.now()) {
  switch (range) {
    case MATCH_RANGES.LAST_7_DAYS:
      return new Date(now - 7 * DAY_MS).toISOString();
    case MATCH_RANGES.LAST_30_DAYS:
      return new Date(now - 30 * DAY_MS).toISOString();
    case MATCH_RANGES.THIS_YEAR:
      return new Date(new Date(now).getFullYear(), 0, 1).toISOString();
    default:
      return '';
  }
}
