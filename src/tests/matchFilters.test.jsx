import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Matches from '../app/(tabs)/matches.jsx';
import MatchCard, { playedAt } from '../components/match/MatchCard.jsx';
import '../i18n/index.js';
import { MATCH_RANGES, rangeStart } from '../utils/matchRanges.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15_000);

const DAY_MS = 24 * 60 * 60 * 1000;
const team = (n) => ({ id: `t${n}`, name: `Team ${n}`, shortName: `T${n}`, logoUrl: null });

const completedMatch = (extra = {}) => ({
  id: 'm1',
  sport: 'kabaddi',
  status: 'completed',
  tournament: { id: 'tr1', name: 'Durg Kabaddi League' },
  round: null,
  roundLabel: null,
  teamA: team(1),
  teamB: team(2),
  teamAScore: 40,
  teamBScore: 30,
  winner: 't1',
  isTie: false,
  scheduledAt: '2026-09-20T10:00:00.000Z',
  startedAt: '2026-09-20T10:05:00.000Z',
  endedAt: '2026-09-20T11:15:00.000Z',
  venue: 'Rohtak',
  phase: null,
  half: null,
  clock: null,
  rules: { firstHalfDurationSeconds: 1200, secondHalfDurationSeconds: 1200 },
  ...extra,
});

const page = (items = []) => ({
  items,
  pagination: { page: 1, limit: 12, total: items.length, totalPages: items.length ? 1 : 0 },
  serverTime: '2026-09-21T10:00:00.000Z',
});

const TOURNAMENTS = {
  items: [
    { id: 'tr1', name: 'Durg Kabaddi League' },
    { id: 'tr2', name: 'Bhilai Open' },
  ],
  pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

let api;

// Every filter here offers fewer options than the sheet's search threshold, so
// the list is tapped straight away — no search box appears.
async function pick(label, option) {
  fireEvent.press(screen.getByLabelText(label));
  fireEvent.press(await screen.findByLabelText(option));
  await waitFor(() => expect(screen.queryByLabelText(option)).toBeNull());
}

// The matches request the screen sent last.
const lastMatchCall = () => api.calls.filter((call) => call.url === '/matches').at(-1);

function stubApi(items = []) {
  api = fakeApi(({ url }) => {
    if (url === '/matches') return ok(page(items));
    if (url === '/tournaments') return ok(TOURNAMENTS);
    return ok(page());
  });
}

const openCompleted = async () => {
  fireEvent.press(screen.getByRole('tab', { name: 'Completed' }));
  await waitFor(() => expect(screen.getByLabelText('Tournament')).toBeTruthy());
};

beforeEach(resetSession);
afterEach(() => api?.restore());

describe('the named date ranges', () => {
  const now = Date.parse('2026-09-21T10:00:00.000Z');

  it('starts the last-7-days range seven days back', () => {
    expect(rangeStart(MATCH_RANGES.LAST_7_DAYS, now)).toBe(
      new Date(now - 7 * DAY_MS).toISOString(),
    );
  });

  it('starts the last-30-days range thirty days back', () => {
    expect(rangeStart(MATCH_RANGES.LAST_30_DAYS, now)).toBe(
      new Date(now - 30 * DAY_MS).toISOString(),
    );
  });

  it('starts this year on 1 January', () => {
    expect(rangeStart(MATCH_RANGES.THIS_YEAR, now)).toBe(new Date(2026, 0, 1).toISOString());
  });

  it('has no start when no range is chosen, so every match is in scope', () => {
    expect(rangeStart('', now)).toBe('');
    expect(rangeStart(undefined, now)).toBe('');
  });

  it('ignores a range it does not know rather than inventing a bound', () => {
    expect(rangeStart('lastDecade', now)).toBe('');
  });
});

describe('when a completed match was played', () => {
  it('reads the end of the match, not its kick-off', () => {
    expect(playedAt(completedMatch())).toBe('2026-09-20T11:15:00.000Z');
  });

  it('falls back to kick-off for a match that was never started', () => {
    expect(playedAt(completedMatch({ startedAt: null, endedAt: null }))).toBe(
      '2026-09-20T10:00:00.000Z',
    );
  });
});

describe('the match card', () => {
  it('shows when a completed match was played', async () => {
    await renderWithQuery(<MatchCard match={completedMatch()} />);

    // 20 September 2026 in the device's zone, however en-IN spells the month.
    expect(screen.getByText(/2026/)).toBeTruthy();
    expect(screen.queryByText('Full time')).toBeNull();
  });

  it('keeps the tie alongside the date, because nothing else on the card says so', async () => {
    await renderWithQuery(
      <MatchCard match={completedMatch({ isTie: true, winner: null, teamBScore: 40 })} />,
    );

    expect(screen.getByText(/Match tied/)).toBeTruthy();
  });
});

describe('the completed-match filters', () => {
  it('are offered on the completed tab only', async () => {
    stubApi();
    await renderWithQuery(<Matches />);

    // The live tab is a real-time view; it carries no archive filters.
    expect(screen.queryByLabelText('Tournament')).toBeNull();
    fireEvent.press(screen.getByRole('tab', { name: 'Upcoming' }));
    await waitFor(() => expect(screen.queryByLabelText('Tournament')).toBeNull());

    await openCompleted();
    expect(screen.getByLabelText('Round')).toBeTruthy();
    expect(screen.getByLabelText('Played')).toBeTruthy();
  });

  it('sends no filter until one is chosen', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();

    await waitFor(() =>
      expect(lastMatchCall().params).toMatchObject({
        status: 'completed',
        tournament: '',
        round: '',
        from: '',
      }),
    );
  });

  it('filters by tournament', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();

    await pick('Tournament', 'Bhilai Open');

    await waitFor(() => expect(lastMatchCall().params).toMatchObject({ tournament: 'tr2' }));
  });

  it('filters by round', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();

    await pick('Round', 'Semi-Final');

    await waitFor(() => expect(lastMatchCall().params).toMatchObject({ round: 'semi_final' }));
  });

  it('filters by a named range, sending it as the `from` bound and no upper edge', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();

    await pick('Played', 'Last 7 days');

    await waitFor(() => expect(lastMatchCall().params.from).toBeTruthy());
    const { from, to } = lastMatchCall().params;
    // Seven days back, to the day.
    const days = (Date.now() - Date.parse(from)) / DAY_MS;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
    // Batch E gave the screen a real from/to pair, so `to` is now always sent
    // and is blank rather than missing when a named range is what was chosen.
    // The API reads a blank bound as absent either way (blankToUndefined).
    expect(to).toBe('');
  });

  it('clears every filter at once', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();
    await pick('Round', 'Final');
    await waitFor(() => expect(screen.getByText('Clear filters')).toBeTruthy());

    fireEvent.press(screen.getByText('Clear filters'));

    await waitFor(() => expect(lastMatchCall().params).toMatchObject({ round: '', from: '' }));
    expect(screen.queryByText('Clear filters')).toBeNull();
  });

  it('keeps the filters when the tab is left and reopened', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();
    await pick('Round', 'Final');

    fireEvent.press(screen.getByRole('tab', { name: 'Live' }));
    // The live tab must not carry the archive's round filter.
    await waitFor(() => expect(lastMatchCall().params).toMatchObject({ status: 'live' }));
    expect(lastMatchCall().params.round).toBeUndefined();

    await openCompleted();
    await waitFor(() => expect(lastMatchCall().params).toMatchObject({ round: 'final' }));
  });

  it('says a filter found nothing, rather than that no match has been played', async () => {
    stubApi();
    await renderWithQuery(<Matches />);
    await openCompleted();
    expect(await screen.findByText('No completed matches yet')).toBeTruthy();

    await pick('Round', 'Final');

    expect(await screen.findByText('No matches found')).toBeTruthy();
    expect(screen.queryByText('No completed matches yet')).toBeNull();
  });

  it('lists the matches a filter found', async () => {
    stubApi([completedMatch({ round: 'final' })]);
    await renderWithQuery(<Matches />);
    await openCompleted();

    await pick('Round', 'Final');

    expect(await screen.findByText('Team 1')).toBeTruthy();
  });
});
