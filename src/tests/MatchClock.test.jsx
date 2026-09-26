import { render, screen } from '@testing-library/react-native';
import MatchClock from '../components/match/MatchClock.jsx';
import '../i18n/index.js';
import { recordServerTime, resetServerClock } from '../lib/serverClock.js';

const T = Date.parse('2026-09-25T06:00:00.000Z');
const iso = (ms) => new Date(ms).toISOString();

afterEach(() => {
  resetServerClock();
  jest.useRealTimers();
});

// The 2026-09-25 incident: a device clock 25 s fast made every running clock
// read 25 s low. The clock must tick in server time.
describe('MatchClock', () => {
  it('shows the server-time remaining on a device whose clock runs 25 s fast', async () => {
    jest.useFakeTimers({ now: T + 25_000 });
    recordServerTime(iso(T), T + 24_900, T + 25_100); // the device is 25 s ahead

    // Started 60 s ago by the server's clock, with 5 minutes already played.
    await render(
      <MatchClock
        clock={{ elapsedMs: 300_000, runningSince: iso(T - 60_000) }}
        halfSeconds={1200}
      />,
    );
    expect(screen.getByText('14:00')).toBeTruthy();
  });

  it('stops at 00:00 once the half is spent', async () => {
    jest.useFakeTimers({ now: T });
    await render(
      <MatchClock
        clock={{ elapsedMs: 1_300_000, runningSince: iso(T - 1_000) }}
        halfSeconds={1200}
      />,
    );
    expect(screen.getByText('00:00')).toBeTruthy();
  });
});
