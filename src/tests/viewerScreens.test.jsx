jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  configure,
  fireEvent,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Matches from '../app/(tabs)/matches.jsx';
import More from '../app/(tabs)/more.jsx';
import PlayerScreen from '../app/player/[id].jsx';
import TeamScreen from '../app/team/[id].jsx';
import TournamentScreen from '../app/tournament/[id].jsx';
import { matchesApi } from '../api/matches.api.js';
import MatchCard, { halfSecondsOf } from '../components/match/MatchCard.jsx';
import { usePagedQuery } from '../hooks/usePagedQuery.js';
import { createQueryClient } from '../lib/queryClient.js';
import { AUTH_STATUS, useAuthStore } from '../store/authStore.js';
import { fakeApi, ok, renderWithQuery, resetSession } from './helpers.jsx';

configure({ asyncUtilTimeout: 5000 });
jest.setTimeout(15_000);

const team = (n) => ({ id: `t${n}`, name: `Team ${n}`, shortName: `T${n}`, logoUrl: null });
const summary = (n, extra = {}) => ({
  id: `m${n}`,
  sport: 'kabaddi',
  status: 'upcoming',
  teamA: team(1),
  teamB: team(2),
  teamAScore: 0,
  teamBScore: 0,
  scheduledAt: '2026-10-01T10:00:00.000Z',
  tournament: null,
  ...extra,
});
let api;

beforeEach(() => {
  resetSession();
  jest.clearAllMocks();
});
afterEach(() => api?.restore());

describe('match cards (B8 half lengths)', () => {
  it('ticks a live card against the match’s own half, not 20 minutes', async () => {
    const match = summary(1, {
      status: 'live',
      phase: 'first_half',
      half: 1,
      clock: { elapsedMs: 5 * 60_000, runningSince: null },
      rules: { firstHalfDurationSeconds: 900, secondHalfDurationSeconds: 900 },
    });
    await renderWithQuery(<MatchCard match={match} />);
    expect(screen.getByText('10:00')).toBeTruthy(); // 15-minute half, 5 played
    expect(halfSecondsOf({ ...match, half: 2, rules: { secondHalfDurationSeconds: 600 } })).toBe(
      600,
    );
    expect(halfSecondsOf({ half: 1 })).toBe(1200); // an older server's summary
  });

  it('opens the match centre', async () => {
    await renderWithQuery(<MatchCard match={summary(7)} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(router.push).toHaveBeenCalledWith('/match/m7');
  });
});

describe('infinite lists', () => {
  it('loads the next page on demand and stops after the last one', async () => {
    const pages = { 1: [summary(1), summary(2)], 2: [summary(3)] };
    api = fakeApi(({ params }) => {
      const page = params?.page ?? 1;
      return ok({
        items: pages[page],
        pagination: { page, limit: 12, total: 3, totalPages: 2 },
        serverTime: new Date().toISOString(),
      });
    });
    const client = createQueryClient();
    client.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(
      () =>
        usePagedQuery({
          queryKey: ['paged-test'],
          fetchPage: ({ page }) => matchesApi.list({ status: 'live', page, limit: 12 }),
        }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);
    await act(() => result.current.fetchNextPage());
    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.hasNextPage).toBe(false);
    expect(api.calls.map((c) => c.params.page)).toEqual([1, 2]);
  });

  it('shows the matches of the chosen status', async () => {
    api = fakeApi(({ params }) =>
      ok({
        items: params.status === 'live' ? [summary(1, { status: 'live' })] : [],
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      }),
    );
    await renderWithQuery(<Matches />);
    expect(await screen.findByText('Team 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Upcoming' }));
    expect(await screen.findByText('No upcoming matches')).toBeTruthy();
  });
});

describe('Tournament', () => {
  it('shows the points table', async () => {
    useLocalSearchParams.mockReturnValue({ id: 'tr1' });
    api = fakeApi(({ url }) => {
      if (url === '/tournaments/tr1') {
        return ok({
          id: 'tr1',
          name: 'Village Cup',
          status: 'ongoing',
          format: 'league',
          startDate: '2026-09-01',
          endDate: '2026-10-01',
          teamsCount: 2,
          sponsors: [],
        });
      }
      if (url === '/rankings/teams') {
        return ok({
          rows: [
            {
              rank: 1,
              team: team(1),
              played: 3,
              won: 2,
              lost: 1,
              tied: 0,
              scoreDiff: 9,
              points: 10,
            },
          ],
        });
      }
      return ok({ matchesPlayed: 3, totals: { totalPoints: 90, allOuts: 2 }, topScorers: [] });
    });
    await renderWithQuery(<TournamentScreen />);
    expect(await screen.findByText('Village Cup')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'Points table' }));
    // The row reads out the whole line of the table.
    expect(
      await screen.findByLabelText(
        '1. Team 1: Played 3, Won 2, Lost 1, Tied 0, Score difference 9, Points 10',
      ),
    ).toBeTruthy();
  });
});

describe('Team', () => {
  it('shows the squad by role, with the playing seven', async () => {
    useLocalSearchParams.mockReturnValue({ id: 't1' });
    const member = (n, role, seven) => ({
      player: { id: `p${n}`, name: `Player ${n}`, photoUrl: null },
      jerseyNumber: n,
      playingRole: role,
      isPlayingSeven: seven,
    });
    api = fakeApi(() =>
      ok({
        ...team(1),
        status: 'active',
        squadCount: 2,
        squad: [member(4, 'raider', true), member(9, 'defender', false)],
      }),
    );
    await renderWithQuery(<TeamScreen />);
    expect(await screen.findByText('Player 4')).toBeTruthy();
    expect(screen.getByText('Raiders (1)')).toBeTruthy();
    expect(screen.getByText('Defenders (1)')).toBeTruthy();
    expect(screen.getByText('1 / 7')).toBeTruthy();
  });
});

describe('Player', () => {
  it('shows career numbers and the recent-form bars', async () => {
    useLocalSearchParams.mockReturnValue({ id: 'p4' });
    api = fakeApi(({ url }) => {
      if (url === '/players/p4') {
        return ok({
          id: 'p4',
          name: 'Player 4',
          currentTeam: team(1),
          membership: { jerseyNumber: 4, playingRole: 'raider' },
          careerStats: { matches: 2, totalPoints: 13, raidPoints: 11, tacklePoints: 2 },
          age: null,
          history: [],
        });
      }
      return ok({
        rates: { raidSuccessRate: 0.5, tackleSuccessRate: 0.25 },
        recentMatches: [
          {
            matchId: 'm1',
            playedAt: '2026-09-20',
            raidPoints: 6,
            tacklePoints: 1,
            totalPoints: 7,
            teamAScore: 30,
            teamBScore: 20,
            teamA: team(1),
            teamB: team(2),
          },
          {
            matchId: 'm2',
            playedAt: '2026-09-22',
            raidPoints: 5,
            tacklePoints: 1,
            totalPoints: 6,
            teamAScore: 25,
            teamBScore: 28,
            teamA: team(1),
            teamB: team(2),
          },
        ],
      });
    });
    await renderWithQuery(<PlayerScreen />);
    expect(await screen.findByText('Raid and tackle points, last 2 matches')).toBeTruthy();
    expect(screen.getByText('13')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});

describe('More', () => {
  it('opens the website’s pages in the in-app browser', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    await renderWithQuery(<More />);
    await fireEvent.press(screen.getByRole('button', { name: /^FAQ/ }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://www.khelscore.in/faq');
  });

  it('offers following only to a signed-in account', async () => {
    useAuthStore.setState({ status: AUTH_STATUS.ANONYMOUS });
    const { rerender } = await renderWithQuery(<More />);
    expect(screen.queryByRole('button', { name: /^Following/ })).toBeNull();
    useAuthStore.setState({ status: AUTH_STATUS.AUTHENTICATED });
    await rerender(<More />);
    expect(await screen.findByRole('button', { name: /^Following/ })).toBeTruthy();
  });
});
