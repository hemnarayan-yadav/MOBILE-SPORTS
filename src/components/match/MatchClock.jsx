// Adapted from MatchClock in frontend/src/components/match/MatchBits.jsx.
import { useNow } from '../../hooks/useNow.js';
import { serverNow } from '../../lib/serverClock.js';
import { clockRemainingSeconds, formatClock, isClockSpent } from '../../utils/format.js';
import AppText from '../common/AppText.jsx';

const DEFAULT_HALF_SECONDS = 20 * 60;

// Remaining time in the half, ticking locally from the server clock state, in
// server time (lib/serverClock.js) so a device with a wrong clock still shows
// the server's time. It stops at 00:00 and never shows a negative time. Only
// this small component re-renders every second, never the list around it.
export default function MatchClock({
  clock,
  halfSeconds = DEFAULT_HALF_SECONDS,
  variant = 'clock',
  tone = 'text',
}) {
  const spent = isClockSpent(clock, halfSeconds, serverNow());
  const now = useNow(1000, Boolean(clock?.runningSince) && !spent);
  const remaining = clockRemainingSeconds(clock, halfSeconds, serverNow(now));
  return (
    <AppText variant={variant} tone={remaining <= 0 ? 'live' : tone}>
      {formatClock(remaining)}
    </AppText>
  );
}
