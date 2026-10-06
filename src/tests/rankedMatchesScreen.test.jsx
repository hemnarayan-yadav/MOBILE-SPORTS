import { configure, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import RankedMatches from '../app/ranked-matches.jsx';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15_000);

const team = (n) => ({ id: `t${n}`, name: `Team ${n}`, shortName: `T${n}`, logoUrl: null });

const match = (n, scheduledAt, extra = {}) => ({
  id: `m${n}`,
  sport: 'kabaddi',
  status: 'completed',
  isRanked: true,
  teamA: team(1),
  teamB: team(2),
  teamAScore: 34,
  teamBScore: 28,
  winner: 't1',
  isTie: false,
  scheduledAt,
  endedAt: scheduledAt,
  tournament: null,
  rules: { firstHalfDurationSeconds: 1200, secondHalfDurationSeconds: 1200 },
  ...extra,
});

const league = { id: 'tr1', name: 'Bhilai League', season: '2026', status: 'ongoing', bannerUrl: null };
const cup = { id: 'tr2', name: 'Durg Cup', season: null, status: 'completed', bannerUrl: null };

const groups = [
  { tournament: cup, matchCount: 1, matches: [match(4, '2026-02-01T14:00:00.000Z')] },
  { tournament: null, matchCount: 1, matches: [match(3, '2026-01-20T14:00:00.000Z')] },
  {
    tournament: league,
    matchCount: 3,
    matches: [
      match(2, '2026-01-12T18:00:00.000Z'),
      match(5, '2026-01-12T14:00:00.000Z'),
      match(1, '2026-01-10T14:00:00.000Z', { status: 'upcoming', teamAScore: 0, teamBScore: 0, winner: null }),
    ],
  },
];

const page = (items, pagination = { page: 1, limit: 10, total: items.length, totalPages: 1 }) =>
  ok({ items, pagination, serverTime: '2026-02-01T12:00:00.000Z' });

let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

describe('the ranked matches screen', () => {
  it('asks the grouped endpoint for one page of competitions', async () => {
    api = fakeApi(() => page([]));
    await renderWithQuery(<RankedMatches />);

    await waitFor(() => expect(screen.getByText('No ranked matches yet')).toBeTruthy());
    const call = api.calls.find((c) => c.url === '/matches/ranked');
    expect(call.params).toEqual({ page: 1, limit: 10 });
  });

  it('shows one block per competition, in the order the API sent them', async () => {
    api = fakeApi(() => page(groups));
    await renderWithQuery(<RankedMatches />);

    await waitFor(() => expect(screen.getByText('Durg Cup')).toBeTruthy());
    expect(screen.getByText('Friendly matches')).toBeTruthy();
    expect(screen.getByText('Bhilai League')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('3 ranked matches')).toBeTruthy();
    expect(screen.getAllByText('1 ranked match')).toHaveLength(2);
  });

  // The point of the screen: never one flat list.
  it('groups a competition’s matches by the day they were played', async () => {
    api = fakeApi(() => page([groups[2]]));
    await renderWithQuery(<RankedMatches />);

    await waitFor(() => expect(screen.getByText('Bhilai League')).toBeTruthy());
    // Two days, each named once, newest first.
    const days = screen.getAllByText(/Jan \d+, 2026|\d+ Jan 2026/);
    expect(days).toHaveLength(2);
    expect(days[0].props.children).toMatch(/12/);
    expect(days[1].props.children).toMatch(/10/);
  });

  it('shows each match’s teams, score and status, and opens the match', async () => {
    api = fakeApi(() => page([groups[2]]));
    await renderWithQuery(<RankedMatches />);

    await waitFor(() => expect(screen.getByText('Bhilai League')).toBeTruthy());
    expect(screen.getAllByText('Team 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('34 – 28')).toHaveLength(2);
    // The upcoming match shows no score.
    expect(screen.getByText('vs')).toBeTruthy();
    expect(screen.getAllByText('Completed')).toHaveLength(2);
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });

  it('opens the competition from its heading', async () => {
    api = fakeApi(() => page([groups[0]]));
    await renderWithQuery(<RankedMatches />);

    const heading = await waitFor(() => screen.getByText('Durg Cup'));
    fireEvent.press(heading);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/tournament/tr2'));
  });
});
